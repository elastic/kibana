/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiBadge,
  EuiResizableButton,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import type { CaseUI } from '../../../../../../common';
import type { CaseConnector } from '../../../../../../common/types/domain';
import * as i18n from '../../../../case_view/translations';
import { AttributesFields } from './attributes_fields';
import { EditConnector } from '../../../../edit_connector';
import { CustomFieldsSection } from './custom_fields_section';
import { TemplateFields } from '../../../../case_view/components/template_fields';
import { GlobalCaseFields } from '../../../../case_view/components/global_case_fields';
import * as redesignI18n from '../../../translations';
import { SidebarAccordionSection } from './sidebar_accordion_section';
import { TemplateSettingsPopover } from './template_settings_popover';
import { ConnectorSettingsPopover } from './connector_settings_popover';
import { useSidebarAccordionsState } from './hooks/use_sidebar_accordions_state';
import { MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, useSidebarResize } from './hooks/use_sidebar_resize';
import { SectionEditProvider } from '../../../../templates_v2/field_types/section_edit_context';
import { CASE_EXTENDED_FIELDS, SECURITY_SOLUTION_OWNER } from '../../../../../../common/constants';
import { useTemplateFieldsActions } from './hooks/use_template_fields_actions';
import { useOnUpdateField } from '../../../../case_view/use_on_update_field';
import { isFieldUpdating } from './utils/sidebar_helpers';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../../../common/use_cases_features';
import { useGetCaseConnectors } from '../../../../../containers/use_get_case_connectors';
import { useGetCaseConfiguration } from '../../../../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../../../../containers/configure/use_get_supported_action_connectors';
import { useGetTemplate } from '../../../../templates_v2/hooks/use_get_template';
import { useGetFieldDefinitions } from '../../../../field_library/hooks/use_get_field_definitions';
import { KibanaServices } from '../../../../../common/lib/kibana';
import { useShowLegacyCustomFields } from '../../../../../common/use_show_old_custom_fields';
import { CustomFieldsDeprecationCallout } from '../../../../case_form_fields/custom_fields_deprecation_callout';
import * as configureCasesI18n from '../../../../configure_cases/translations';

/** Height of Security Solution's fixed bottom "timeline" bar, which overlays every page. */
const SECURITY_TIMELINE_BOTTOM_BAR_OFFSET = '57px';

export interface CaseViewSidebarProps {
  caseData: CaseUI;
}

export const CaseViewSidebar = ({ caseData }: CaseViewSidebarProps) => {
  const { euiTheme } = useEuiTheme();
  const fieldsGroupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);

  const { width, sidebarRef, onPointerDown, onKeyDown } = useSidebarResize();

  // Security Solution overlays every page with a fixed "timeline" bar at the bottom of the viewport.
  // Nothing else does, so reserving the space elsewhere would only leave dead space — but on
  // Security the bar would otherwise sit on top of the pinned panel's own Save/Cancel bar.
  const { owner } = useCasesContext();
  const bottomBarOffset = owner.includes(SECURITY_SOLUTION_OWNER)
    ? SECURITY_TIMELINE_BOTTOM_BAR_OFFSET
    : '0px';

  const styles = useMemo(
    () => ({
      // Pinned while the activity feed scrolls past. The case's attributes are reference material
      // for whatever is being read on the left, so they should not have to be scrolled back to.
      stickyContainer: css({
        position: 'sticky',
        insetBlockStart: `var(--euiFixedHeadersOffset, 0px)`,
        display: 'flex',
        alignItems: 'stretch',
        // Sized to the scrollport, which under Kibana's chrome layout is the application container
        // rather than the document — `100vh` overshoots it by the chrome header, which pushed the
        // bottom of the panel (and the connectors section) below the fold. The `100vh` fallback
        // covers the legacy layout, where the document does scroll and the fixed-header offset
        // is the thing to subtract.
        maxBlockSize: `calc(
          var(--kbn-layout--application-height, calc(100vh - var(--euiFixedHeadersOffset, 0px)))
          - ${euiTheme.size.xl}
          - ${bottomBarOffset}
        )`,
        minBlockSize: 0,
      }),
      // The frame is the panel itself and it does NOT scroll — the sections scroll inside it. That
      // matters for the border: EuiPanel draws `hasBorder` as an absolutely positioned `::after`
      // overlay, so on a scrolling element the overlay scrolls too and the top edge of the outline
      // disappears as soon as you move. Keeping the frame fixed and scrolling a child instead pins
      // all four edges. `overflow: hidden` also clips the sections to the frame's rounded corners.
      framedPanel: css({
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minInlineSize: 0,
        minBlockSize: 0,
        overflow: 'hidden',
        // That overlay sits at `z-index: 0`, and the sections pin their titles above it while
        // bleeding to the full panel width — so without this the opaque pinned header paints over
        // the 1px outline and punches a hole in it. It is `pointer-events: none`, so lifting it
        // above the content costs nothing.
        '&::after': {
          zIndex: 3,
        },
      }),
      // The scrolling region inside the fixed frame. This is the scrollport each section's title
      // pins against.
      scrollArea: css({
        flexGrow: 1,
        minInlineSize: 0,
        minBlockSize: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
      }),
      // A gutter between the activity column and the panel that is itself the drag target: full
      // height, so it can be grabbed anywhere down the seam, and wide enough to hit without aiming.
      // The panel is pinned, so a centred grab indicator is always on screen.
      //
      // `marginInline: 0` overrides EuiResizableButton's built-in `0 -8px`, which exists so the rail
      // can overlap the panels either side of it. Here that overlap put the rail's right half on top
      // of the panel's leading edge, notching the border and the rounded corner underneath it. With
      // the margin removed the rail occupies the gutter alone and the panel's edge stays whole.
      resizeHandle: css({
        flexShrink: 0,
        alignSelf: 'stretch',
        blockSize: 'auto',
        inlineSize: euiTheme.size.base,
        marginInline: 0,
      }),
    }),
    [euiTheme, bottomBarOffset]
  );

  const { isOpen, onToggle } = useSidebarAccordionsState();

  const { permissions } = useCasesContext();
  const { pushToServiceAuthorized } = useCasesFeatures();
  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { data: casesConfiguration } = useGetCaseConfiguration();
  const { isLoading: isLoadingAllAvailableConnectors, data: supportedActionConnectors } =
    useGetSupportedActionConnectors();
  const isTemplatesV2Enabled = KibanaServices.getConfig()?.templates?.enabled ?? false;
  const { showLegacyCustomFields } = useShowLegacyCustomFields(
    casesConfiguration?.customFields ?? []
  );

  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version, {
    includeDeleted: true,
  });

  // Same query GlobalCaseFields issues (React Query deduplicates them): the section needs to
  // tell "no template and no global fields" apart from "global fields render below" so it can
  // show a designed empty state instead of an empty body. Disabled while templates v2 is off,
  // since the section that needs it never renders.
  const { data: globalFieldDefinitions, isLoading: isLoadingGlobalFieldDefinitions } =
    useGetFieldDefinitions({
      owner: isTemplatesV2Enabled ? caseData.owner : undefined,
      isGlobal: true,
      staleTime: Infinity,
    });
  const hasGlobalFields = (globalFieldDefinitions?.fieldDefinitions?.length ?? 0) > 0;
  const showFieldsEmptyState =
    !caseData.template?.id && !isLoadingGlobalFieldDefinitions && !hasGlobalFields;

  // The name — not the "Template:" label — is what the reader scans for, so it carries the
  // emphasis while the label stays subdued.
  const templateNameStyles = useMemo(() => css({ color: euiTheme.colors.textHeading }), [euiTheme]);

  // A permanent subtitle slot under the section title: the second line always names the
  // template state, so status never has to masquerade as body content between the fields.
  const fieldsSubtitle = caseData.template?.id ? (
    templateData?.name ? (
      <EuiText
        size="xs"
        color="subdued"
        className="eui-textTruncate"
        // Long names truncate with an ellipsis, so expose the full name on hover.
        title={templateData.name}
        data-test-subj="case-view-sidebar-applied-template"
      >
        <FormattedMessage
          id="xpack.cases.casesRedesign.details.fieldsSectionTemplateSubtitle"
          defaultMessage="Template: {name}"
          values={{
            name: <strong css={templateNameStyles}>{templateData.name}</strong>,
          }}
        />
      </EuiText>
    ) : null
  ) : (
    <EuiText
      size="xs"
      color="subdued"
      className="eui-textTruncate"
      data-test-subj="case-view-sidebar-no-template-applied"
    >
      {redesignI18n.NO_TEMPLATE_APPLIED}
    </EuiText>
  );

  const { onUpdateField, onSaveCustomFields, isCustomFieldsLoading } = useTemplateFieldsActions({
    caseData,
  });

  const {
    onUpdateField: onUpdateConnectorField,
    isLoading: isConnectorFieldUpdating,
    loadingKey: connectorLoadingKey,
  } = useOnUpdateField({ caseData });

  const onSaveExtendedFields = useCallback(
    (
      value: Record<string, unknown>,
      { onSuccess, onError }: { onSuccess: () => void; onError: () => void }
    ) => onUpdateField({ key: CASE_EXTENDED_FIELDS, value, onSuccess, onError }),
    [onUpdateField]
  );

  const onSubmitConnector = useCallback(
    (connector: CaseConnector) => onUpdateConnectorField({ key: 'connector', value: connector }),
    [onUpdateConnectorField]
  );

  const isConnectorLoading = useMemo(
    () =>
      isLoadingAllAvailableConnectors ||
      isFieldUpdating(isConnectorFieldUpdating, connectorLoadingKey, 'connector'),
    [isLoadingAllAvailableConnectors, isConnectorFieldUpdating, connectorLoadingKey]
  );

  const hasConfiguredCustomFields = (casesConfiguration?.customFields?.length ?? 0) > 0;

  // Templates v2 off: always show configured legacy custom fields (they are the only system).
  // Templates v2 on: gate on the Settings local-storage switch.
  const showLegacyCustomFieldsAccordion =
    hasConfiguredCustomFields && (!isTemplatesV2Enabled || showLegacyCustomFields);

  return (
    <EuiFlexItem
      grow={false}
      ref={sidebarRef}
      // `flexBasis` is the resize handle's live output: it is mutated inline during a drag so a
      // pointer move never re-renders the case view (and its embeddable attachments), then
      // reconciled from state when the drag commits. Min/max stay in CSS.
      style={{ flexBasis: width }}
      css={css({
        flexShrink: 0,
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH,
      })}
    >
      <EuiSpacer size="s" />
      <div css={styles.stickyContainer}>
        <EuiResizableButton
          isHorizontal
          indicator="handle"
          alignIndicator="center"
          aria-label={redesignI18n.RESIZE_SIDEBAR}
          aria-valuenow={width}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          css={styles.resizeHandle}
          data-test-subj="case-view-sidebar-resize-button"
        />
        <EuiPanel
          data-test-subj="case-view-page-sidebar"
          hasShadow={false}
          hasBorder={true}
          paddingSize="none"
          grow={false}
          css={styles.framedPanel}
        >
          <div css={styles.scrollArea}>
            <EuiScreenReaderOnly>
              <h2>{i18n.CASE_SETTINGS}</h2>
            </EuiScreenReaderOnly>
            <SidebarAccordionSection
              id="attributes"
              title={redesignI18n.ATTRIBUTES_TITLE}
              isOpen={isOpen('attributes')}
              onToggle={onToggle}
              data-test-subj="case-view-sidebar-attributes"
            >
              <AttributesFields caseData={caseData} />
            </SidebarAccordionSection>
            {showLegacyCustomFieldsAccordion ? (
              // The provider sits outside the section, not inside it: the section renders the save
              // row in its own pinned header (see the template fields section below), so it has to
              // be able to read this state.
              <SectionEditProvider onSave={onSaveCustomFields}>
                <SidebarAccordionSection
                  withDivider
                  id="legacyCustomFields"
                  title={
                    isTemplatesV2Enabled ? (
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          {redesignI18n.LEGACY_CUSTOM_FIELDS_TITLE}
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            color="warning"
                            data-test-subj="legacy-custom-fields-deprecated-badge"
                          >
                            {configureCasesI18n.DEPRECATED_BADGE}
                          </EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ) : (
                      redesignI18n.LEGACY_CUSTOM_FIELDS_TITLE
                    )
                  }
                  isOpen={isOpen('legacyCustomFields')}
                  onToggle={onToggle}
                  data-test-subj="case-view-sidebar-legacy-custom-fields"
                >
                  {isTemplatesV2Enabled ? (
                    <>
                      <CustomFieldsDeprecationCallout
                        title={redesignI18n.LEGACY_CUSTOM_FIELDS_TITLE}
                      />
                      <EuiSpacer size="m" />
                    </>
                  ) : null}
                  <CustomFieldsSection
                    isLoading={isCustomFieldsLoading}
                    customFields={caseData.customFields}
                    customFieldsConfiguration={casesConfiguration.customFields}
                  />
                </SidebarAccordionSection>
              </SectionEditProvider>
            ) : null}
            {isTemplatesV2Enabled ? (
              /* The provider sits outside the section, not inside it: the section renders the save
                 row in its own pinned header, so it has to be able to read this state. */
              <SectionEditProvider onSave={onSaveExtendedFields}>
                <SidebarAccordionSection
                  withDivider
                  id="templateFields"
                  title={redesignI18n.CUSTOM_FIELDS_SECTION_TITLE}
                  subtitle={fieldsSubtitle}
                  extraAction={
                    permissions.update ? (
                      <TemplateSettingsPopover
                        caseData={caseData}
                        data-test-subj="case-view-sidebar-template-fields-settings"
                      />
                    ) : undefined
                  }
                  isOpen={isOpen('templateFields')}
                  onToggle={onToggle}
                  data-test-subj="case-view-sidebar-template-fields"
                >
                  {/* Global fields and template fields are separate forms but one section to the
                  reader, so one edit mode and one Save cover both. */}
                  <EuiFlexGroup direction="column" responsive={false} css={fieldsGroupStyles}>
                    {/* Template status lives in the section's subtitle, so the body only speaks
                      when it would otherwise be empty — and points at the action that fills it
                      rather than restating the subtitle. */}
                    {showFieldsEmptyState ? (
                      // Matches the sibling empty state in this sidebar (assignees_field): subdued
                      // body text, no icon, no italics.
                      <EuiText
                        size="s"
                        color="subdued"
                        data-test-subj="case-view-sidebar-fields-empty"
                      >
                        <p>{redesignI18n.APPLY_TEMPLATE_TO_SEE_FIELDS}</p>
                      </EuiText>
                    ) : null}
                    {/* Global (isGlobal) fields apply to every case regardless of the template.
                      Redesign accordion already labels this section — hide Extended fields heading. */}
                    <GlobalCaseFields
                      caseData={caseData}
                      onUpdateField={onUpdateField}
                      showSectionTitle={false}
                    />
                    {caseData.template?.id ? (
                      <TemplateFields
                        caseData={caseData}
                        onUpdateField={onUpdateField}
                        showHeader={false}
                      />
                    ) : null}
                  </EuiFlexGroup>
                </SidebarAccordionSection>
              </SectionEditProvider>
            ) : null}
            {pushToServiceAuthorized && caseConnectors && supportedActionConnectors ? (
              <SidebarAccordionSection
                withDivider
                id="connectors"
                title={redesignI18n.CONNECTORS_TITLE}
                extraAction={
                  permissions.settings ? (
                    <ConnectorSettingsPopover data-test-subj="case-view-sidebar-connectors-settings" />
                  ) : undefined
                }
                isOpen={isOpen('connectors')}
                onToggle={onToggle}
                data-test-subj="case-view-sidebar-connectors"
              >
                <EditConnector
                  caseData={caseData}
                  caseConnectors={caseConnectors}
                  supportedActionConnectors={supportedActionConnectors}
                  isLoading={isConnectorLoading}
                  onSubmit={onSubmitConnector}
                  showHeader={false}
                  actionsVariant="outlined"
                  // ConnectorsForm's `useForm` only reads `caseData.connector` as its
                  // `defaultValue` on mount, so remount on connector id change to pick up
                  // the committed connector/fields once the update round-trips through the
                  // server. Matches the equivalent key on the non-redesigned sidebar
                  // (case_view_activity.tsx).
                  key={caseData.connector.id}
                />
              </SidebarAccordionSection>
            ) : null}
          </div>
        </EuiPanel>
      </div>
    </EuiFlexItem>
  );
};
CaseViewSidebar.displayName = 'CaseViewSidebar';
