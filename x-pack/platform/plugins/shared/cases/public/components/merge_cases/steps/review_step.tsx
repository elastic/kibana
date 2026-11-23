/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinMinBreakpoint,
  useResizeObserver,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { AiIcon } from '@kbn/ui-ai-components';
import type { MergeCasesPreviewResponse, MergePreviewCase } from '../../../../common/types/api';
import { CaseStatuses, ConnectorTypes } from '../../../../common/types/domain';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { MarkdownRenderer } from '../../markdown_editor/renderer';
import { SeverityHealth } from '../../severity/config';
import { CaseRef, CaseRefs } from '../value_cards/case_refs';
import { formatCustomValue, formatExtendedValue } from '../value_cards/field_rows';
import type {
  MergeFieldChoices,
  MergeFieldKey,
  MergedCasePreview,
  MergedValueSource,
  SelectedAttachments,
} from '../utils';
import {
  formatTemplateFieldValue,
  getCaseReference,
  getMergedCasePreview,
  splitOverflow,
} from '../utils';
import * as i18n from '../translations';
import {
  AI_SUGGESTED,
  AI_SUGGESTED_WITH_REASON,
  SECTION_CUSTOM_FIELDS,
  SECTION_TEMPLATE_FIELDS,
  SECTION_TEMPLATE_FIELDS_DEFAULT,
} from '../value_cards/translations';

const VISIBLE_SOURCES = 4;
const VISIBLE_TAGS = 3;
const VISIBLE_ASSIGNEES = 4;
const SIDEBAR_WIDTH = 264;
/** About six lines of the description. */
const DESCRIPTION_MAX_HEIGHT = 144;

type TabKind = 'alerts' | 'observables' | 'events' | 'other';

const ATTACHMENT_TABS: ReadonlyArray<{ kind: TabKind; label: string }> = [
  { kind: 'alerts', label: i18n.ALERTS },
  { kind: 'observables', label: i18n.OBSERVABLES },
  { kind: 'events', label: i18n.EVENTS },
  { kind: 'other', label: i18n.OTHER_ATTACHMENTS_SHORT },
];

/** "Suggested by AI", with the AI's reason on hover and focus. */
const AiSuggested: React.FC<{ reason: string; fieldKey: MergeFieldKey }> = ({
  reason,
  fieldKey,
}) => (
  <EuiToolTip content={AI_SUGGESTED_WITH_REASON(reason)}>
    <span tabIndex={0} data-test-subj={`merge-review-ai-${fieldKey}`}>
      <AiIcon iconType="sparkles" size="s" aria-hidden={true} /> {AI_SUGGESTED}
    </span>
  </EuiToolTip>
);
AiSuggested.displayName = 'AiSuggested';

interface FieldOriginProps {
  caseIds: string[];
  source: MergedValueSource;
  cases: MergePreviewCase[];
  fieldKey: MergeFieldKey;
  /** Why the AI chose each value, by field. */
  aiReasons: ReadonlyMap<MergeFieldKey, string>;
}

/** Where a merged value comes from, and whether the AI chose it. */
const FieldOrigin = React.memo<FieldOriginProps>(
  ({ caseIds, source, cases, fieldKey, aiReasons }) => {
    const aiReason = aiReasons.get(fieldKey);
    const origin = (() => {
      switch (source) {
        case 'cases':
          return caseIds.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>{i18n.FROM}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <CaseRefs caseIds={caseIds} cases={cases} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null;
        case 'combined':
          return i18n.COMBINED_FROM(new Set(caseIds).size);
        case 'own':
          return i18n.YOUR_OWN_VALUE;
        case 'templateDefault':
          return i18n.TEMPLATE_DEFAULT;
        default:
          return null;
      }
    })();

    if (origin == null && aiReason == null) {
      return null;
    }

    return (
      <EuiText size="xs" color="subdued" data-test-subj={`merge-review-source-${fieldKey}`}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          {aiReason != null ? (
            <EuiFlexItem grow={false}>
              <AiSuggested reason={aiReason} fieldKey={fieldKey} />
            </EuiFlexItem>
          ) : null}
          {aiReason != null && origin != null ? (
            <EuiFlexItem grow={false} aria-hidden={true}>
              {'·'}
            </EuiFlexItem>
          ) : null}
          {origin != null ? <EuiFlexItem grow={false}>{origin}</EuiFlexItem> : null}
        </EuiFlexGroup>
      </EuiText>
    );
  }
);
FieldOrigin.displayName = 'FieldOrigin';

/** A field as on the case page: its label, the value, then where it comes from. */
const PreviewField: React.FC<{
  label: string;
  children: React.ReactNode;
  origin?: React.ReactNode;
  testSubj: string;
}> = ({ label, children, origin, testSubj }) => (
  <div data-test-subj={testSubj}>
    <EuiTitle size="xxxs">
      <h4>{label}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s">{children}</EuiText>
    {origin}
  </div>
);
PreviewField.displayName = 'PreviewField';

/** A titled group of sidebar fields, set apart from the fields above it. */
const SidebarGroup: React.FC<{ title: string; children: React.ReactNode; testSubj: string }> = ({
  title,
  children,
  testSubj,
}) => (
  <EuiFlexItem grow={false} data-test-subj={testSubj}>
    <EuiHorizontalRule margin="none" />
    <EuiSpacer size="m" />
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      {children}
    </EuiFlexGroup>
  </EuiFlexItem>
);
SidebarGroup.displayName = 'SidebarGroup';

/** The description, cut to about six lines until Show all. */
const ClampedDescription: React.FC<{ value: string }> = ({ value }) => {
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { height } = useResizeObserver(content, 'height');
  const isClamped = height > DESCRIPTION_MAX_HEIGHT;

  return (
    <>
      <div
        css={
          isExpanded
            ? undefined
            : css`
                max-height: ${DESCRIPTION_MAX_HEIGHT}px;
                overflow: hidden;
              `
        }
        data-test-subj="merge-review-description"
      >
        <div ref={setContent}>
          <MarkdownRenderer textSize="s">{value}</MarkdownRenderer>
        </div>
      </div>
      {isClamped ? (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          data-test-subj="merge-review-description-toggle"
        >
          {isExpanded ? i18n.SHOW_LESS : i18n.SHOW_ALL}
        </EuiButtonEmpty>
      ) : null}
    </>
  );
};
ClampedDescription.displayName = 'ClampedDescription';

interface SourceCasesPanelProps {
  cases: MergePreviewCase[];
  destinationCaseId?: string;
  closeSources: boolean;
  onSetCloseSources: (closeSources: boolean) => void;
  isDisabled: boolean;
}

/** The source cases and whether the merge closes them, each with the status it ends up in. */
const SourceCasesPanel = React.memo<SourceCasesPanelProps>(
  ({ cases, destinationCaseId, closeSources, onSetCloseSources, isDisabled }) => {
    const { euiTheme } = useEuiTheme();
    const idPrefix = useGeneratedHtmlId({ prefix: 'mergeReviewSources' });
    const [showAll, setShowAll] = useState(false);

    const sources = cases.filter(({ id }) => id !== destinationCaseId);
    const openSources = sources.filter(({ status }) => status !== CaseStatuses.closed);
    const { visible, hidden } = splitOverflow(sources, {
      max: VISIBLE_SOURCES,
      visibleWhenOverflowing: VISIBLE_SOURCES,
    });

    return (
      <EuiPanel
        hasBorder
        paddingSize="none"
        aria-labelledby={`${idPrefix}-title`}
        data-test-subj="merge-review-sources"
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="m"
          responsive={false}
          wrap
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3 id={`${idPrefix}-title`}>{i18n.SOURCE_CASES}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge size="m" color="subdued">
                  {sources.length}
                </EuiNotificationBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip content={i18n.SOURCES_KEEP} aria-label={i18n.SOURCES_KEEP_INFO} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued" data-test-subj="merge-review-sources-summary">
              {i18n.SOURCES_CLOSE_SUMMARY(
                closeSources ? openSources.length : 0,
                sources.length - openSources.length
              )}
            </EuiText>
          </EuiFlexItem>
          {openSources.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={<strong>{i18n.CLOSE_SOURCES(openSources.length)}</strong>}
                checked={closeSources}
                disabled={isDisabled}
                onChange={(event) => onSetCloseSources(event.target.checked)}
                data-test-subj="merge-cases-close-sources"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <div>
          {[...visible, ...(showAll ? hidden : [])].map((theCase) => {
            const isClosed = theCase.status === CaseStatuses.closed;
            return (
              <React.Fragment key={theCase.id}>
                <EuiHorizontalRule margin="none" />
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  css={css`
                    padding: ${euiTheme.size.s} ${euiTheme.size.m};
                  `}
                  data-test-subj={`merge-review-source-${theCase.id}`}
                >
                  <EuiFlexItem grow={false}>
                    <CaseRef caseId={theCase.id} cases={cases} />
                  </EuiFlexItem>
                  <EuiFlexItem
                    css={css`
                      min-width: 0;
                    `}
                  >
                    <EuiText size="s" className="eui-textTruncate" title={theCase.title}>
                      {theCase.title}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <Status status={theCase.status} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} aria-label={i18n.BECOMES}>
                    <EuiText size="s" color="subdued" aria-hidden={true}>
                      {'→'}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      width: 96px;
                      align-items: flex-start;
                    `}
                  >
                    {closeSources && !isClosed ? (
                      <Status status={CaseStatuses.closed} />
                    ) : (
                      <EuiText size="xs" color="subdued">
                        {isClosed ? i18n.STAYS_CLOSED : i18n.STAYS_AS_IS}
                      </EuiText>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </React.Fragment>
            );
          })}
          {hidden.length > 0 ? (
            <>
              <EuiHorizontalRule margin="none" />
              <EuiButtonEmpty
                size="s"
                iconType={showAll ? 'chevronSingleUp' : 'chevronSingleDown'}
                iconSide="right"
                aria-expanded={showAll}
                onClick={() => setShowAll((current) => !current)}
                data-test-subj="merge-review-show-more-sources"
              >
                {showAll ? i18n.SHOW_FEWER : i18n.SHOW_MORE_CASES(hidden.length)}
              </EuiButtonEmpty>
            </>
          ) : null}
        </div>
      </EuiPanel>
    );
  }
);
SourceCasesPanel.displayName = 'SourceCasesPanel';

type FieldFrom = Pick<FieldOriginProps, 'caseIds' | 'source'>;

interface PreviewDetailsProps {
  fields: MergeCasesPreviewResponse['fields'];
  merged: MergedCasePreview;
  showAssignees: boolean;
  originOf: (fieldKey: MergeFieldKey, from: FieldFrom) => React.ReactNode;
}

/** The case page's sidebar: people, tags, then the rest of the fields. */
const PreviewDetails: React.FC<PreviewDetailsProps> = ({
  fields,
  merged,
  showAssignees,
  originOf,
}) => {
  const { connector, template } = merged;
  const assigneeUids = useMemo(
    () => (showAssignees ? merged.assignees.map(({ uid }) => uid) : []),
    [merged.assignees, showAssignees]
  );
  const { data: userProfiles } = useBulkGetUserProfiles({ uids: assigneeUids });

  const assignees = splitOverflow(merged.assignees, {
    max: VISIBLE_ASSIGNEES + 1,
    visibleWhenOverflowing: VISIBLE_ASSIGNEES,
  });
  const tags = splitOverflow(merged.tags, {
    max: VISIBLE_TAGS + 1,
    visibleWhenOverflowing: VISIBLE_TAGS,
  });
  const tagCaseIds = [...new Set(fields.tags.items.flatMap(({ caseIds }) => caseIds))];
  const assigneeCaseIds = [...new Set(fields.assignees.items.flatMap(({ caseIds }) => caseIds))];

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      {showAssignees ? (
        <PreviewField
          label={i18n.ASSIGNEES_FIELD}
          testSubj="merge-review-assignees"
          origin={originOf('assignees', {
            caseIds: assigneeCaseIds,
            source: assigneeCaseIds.length > 0 ? 'combined' : 'none',
          })}
        >
          {merged.assignees.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.NOT_SET_IN_ANY_CASE}
            </EuiText>
          ) : (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              {assignees.visible.map(({ uid }) => {
                const profile = userProfiles?.get(uid);
                return (
                  <EuiFlexItem grow={false} key={uid}>
                    {profile != null ? (
                      <UserAvatar
                        user={profile.user}
                        avatar={profile.data.avatar}
                        size="s"
                        title={getUserDisplayName(profile.user)}
                      />
                    ) : (
                      <EuiAvatar name={uid} size="s" />
                    )}
                  </EuiFlexItem>
                );
              })}
              {assignees.hidden.length > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{i18n.MORE_ITEMS(assignees.hidden.length)}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          )}
        </PreviewField>
      ) : null}
      <PreviewField
        label={i18n.TAGS_FIELD}
        testSubj="merge-review-tags"
        origin={originOf('tags', {
          caseIds: tagCaseIds,
          source: tagCaseIds.length > 0 ? 'combined' : 'none',
        })}
      >
        {merged.tags.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.NOT_SET_IN_ANY_CASE}
          </EuiText>
        ) : (
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {tags.visible.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
            {tags.hidden.length > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.MORE_ITEMS(tags.hidden.length)}</EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        )}
      </PreviewField>
      <PreviewField
        label={i18n.CATEGORY_FIELD}
        testSubj="merge-review-category"
        origin={originOf('category', merged.category)}
      >
        {merged.category.value ?? i18n.NOT_SET_IN_ANY_CASE}
      </PreviewField>
      {fields.template.candidates.length > 0 || template.value != null ? (
        <PreviewField
          label={i18n.TEMPLATE_FIELD}
          testSubj="merge-review-template"
          origin={originOf('template', template)}
        >
          {template.value?.name ?? i18n.NO_TEMPLATE}
        </PreviewField>
      ) : null}
      {connector.value.type !== ConnectorTypes.none || fields.connector.hasConflict ? (
        <PreviewField
          label={i18n.CONNECTOR_FIELD}
          testSubj="merge-review-connector"
          origin={originOf('connector', connector)}
        >
          {connector.value.type === ConnectorTypes.none ? i18n.NO_CONNECTOR : connector.value.name}
        </PreviewField>
      ) : null}
      {merged.customFields.length > 0 ? (
        <SidebarGroup title={SECTION_CUSTOM_FIELDS} testSubj="merge-review-custom-fields">
          {merged.customFields.map((field) => {
            const key: MergeFieldKey = `customFields.${field.key}`;
            const row = fields.customFields.find((candidate) => candidate.key === field.key);
            return (
              <PreviewField
                key={key}
                label={field.label}
                testSubj={`merge-review-${key}`}
                origin={originOf(key, field)}
              >
                {row != null ? formatCustomValue(row.type, field.value) : String(field.value)}
              </PreviewField>
            );
          })}
        </SidebarGroup>
      ) : null}
      {merged.extendedFields.length > 0 ? (
        <SidebarGroup
          title={
            template.value?.name != null
              ? SECTION_TEMPLATE_FIELDS(template.value.name)
              : SECTION_TEMPLATE_FIELDS_DEFAULT
          }
          testSubj="merge-review-template-fields"
        >
          {merged.extendedFields.map((field) => {
            const key: MergeFieldKey = `extendedFields.${field.key}`;
            const row = fields.extendedFields.find((candidate) => candidate.key === field.key);
            return (
              <PreviewField
                key={key}
                label={field.label}
                testSubj={`merge-review-${key}`}
                origin={originOf(key, field)}
              >
                {row != null
                  ? formatExtendedValue(row, field.value)
                  : formatTemplateFieldValue(field.value)}
              </PreviewField>
            );
          })}
        </SidebarGroup>
      ) : null}
    </EuiFlexGroup>
  );
};
PreviewDetails.displayName = 'PreviewDetails';

export interface ReviewStepProps {
  preview: MergeCasesPreviewResponse;
  choices: MergeFieldChoices;
  /** Why the AI chose a field's value, until the user changes it. */
  aiReasons: ReadonlyMap<MergeFieldKey, string>;
  /** The preview counts after the user's exclusions. */
  attachments: SelectedAttachments;
  destinationCaseId?: string;
  closeSources: boolean;
  onSetCloseSources: (closeSources: boolean) => void;
  showAssignees: boolean;
  isDisabled: boolean;
}

/**
 * Step 4: what happens to the source cases, then the merged case laid out like the case page.
 * The source cases come first so closing them is never scrolled past.
 */
export const ReviewStep = React.memo<ReviewStepProps>(
  ({
    preview,
    choices,
    aiReasons,
    attachments,
    destinationCaseId,
    closeSources,
    onSetCloseSources,
    showAssignees,
    isDisabled,
  }) => {
    const { euiTheme } = useEuiTheme();
    const hasSidebarRoom = useIsWithinMinBreakpoint('xl');
    const [showOrigins, setShowOrigins] = useState(false);
    const { cases, fields } = preview;

    const merged = useMemo(() => getMergedCasePreview(preview, choices), [choices, preview]);
    const destination =
      destinationCaseId != null ? cases.find(({ id }) => id === destinationCaseId) : undefined;
    const destinationRef = destination != null ? getCaseReference(destination) : undefined;

    /** Where a value comes from, only while "Show where values come from" is on. */
    const originOf = (fieldKey: MergeFieldKey, { caseIds, source }: FieldFrom) =>
      showOrigins ? (
        <FieldOrigin
          cases={cases}
          aiReasons={aiReasons}
          fieldKey={fieldKey}
          caseIds={caseIds}
          source={source}
        />
      ) : null;

    const tabCount = (kind: TabKind) => attachments[kind].toCopy + attachments[kind].existing;

    return (
      <div data-test-subj="merge-cases-review-step">
        <SourceCasesPanel
          cases={cases}
          destinationCaseId={destinationCaseId}
          closeSources={closeSources}
          onSetCloseSources={onSetCloseSources}
          isDisabled={isDisabled}
        />
        <EuiSpacer size="l" />
        <section
          aria-label={i18n.PREVIEW_ARIA_LABEL}
          css={css`
            padding: ${euiTheme.size.s};
            background: ${euiTheme.colors.backgroundBaseSubdued};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
          `}
          data-test-subj="merge-review-preview"
        >
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            responsive={false}
            wrap
            css={css`
              padding: 0 ${euiTheme.size.xs} ${euiTheme.size.s};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge iconType="eye">{i18n.PREVIEW}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="merge-review-destination">
                    {destinationRef != null
                      ? i18n.PREVIEW_TRAIL_EXISTING_CASE(destinationRef)
                      : i18n.PREVIEW_TRAIL_NEW_CASE}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={i18n.SHOW_ORIGINS}
                checked={showOrigins}
                onChange={(event) => setShowOrigins(event.target.checked)}
                data-test-subj="merge-review-show-origins"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiPanel hasBorder paddingSize="none" data-test-subj="merge-review-page">
            <div
              css={css`
                padding: ${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.l};
              `}
            >
              <EuiTitle size="s">
                <h3 data-test-subj="merge-review-title">{merged.title.value}</h3>
              </EuiTitle>
              {originOf('title', merged.title)}
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="xl" alignItems="flexStart" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <PreviewField label={i18n.STATUS_FIELD} testSubj="merge-review-status">
                    <Status status={destination?.status ?? CaseStatuses.open} />
                  </PreviewField>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <PreviewField
                    label={i18n.SEVERITY_FIELD}
                    testSubj="merge-review-severity"
                    origin={originOf('severity', merged.severity)}
                  >
                    <SeverityHealth severity={merged.severity.value} />
                  </PreviewField>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <div
              css={css`
                display: grid;
                grid-template-columns: ${hasSidebarRoom
                  ? `minmax(0, 1fr) ${SIDEBAR_WIDTH}px`
                  : 'minmax(0, 1fr)'};
                border-top: ${euiTheme.border.thin};
              `}
            >
              <div
                css={css`
                  min-width: 0;
                  padding: ${euiTheme.size.l};
                `}
              >
                <EuiTitle size="xxxs">
                  <h4>{i18n.DESCRIPTION_FIELD}</h4>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <ClampedDescription value={merged.description.value} />
                {originOf('description', merged.description)}
                <EuiSpacer size="l" />
                <EuiScreenReaderOnly>
                  <p>
                    {i18n.MERGED_ATTACHMENT_COUNTS(
                      tabCount('alerts'),
                      tabCount('observables'),
                      tabCount('events'),
                      tabCount('other')
                    )}
                  </p>
                </EuiScreenReaderOnly>
                {/* The case page's tabs, as counts only: there is nothing to open before the merge. */}
                <EuiTabs
                  size="s"
                  aria-hidden={true}
                  css={css`
                    pointer-events: none;
                  `}
                  data-test-subj="merge-review-attachment-tabs"
                >
                  {ATTACHMENT_TABS.map(({ kind, label }) => (
                    <EuiTab key={kind} data-test-subj={`merge-review-tab-${kind}`}>
                      {label}
                      <EuiNotificationBadge
                        size="m"
                        color="subdued"
                        css={css`
                          border-radius: 999px;
                          margin-left: ${euiTheme.size.xs};
                        `}
                      >
                        {tabCount(kind)}
                      </EuiNotificationBadge>
                    </EuiTab>
                  ))}
                </EuiTabs>
              </div>
              <div
                css={css`
                  padding: ${euiTheme.size.l};
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  ${hasSidebarRoom
                    ? `border-left: ${euiTheme.border.thin};`
                    : `border-top: ${euiTheme.border.thin};`}
                `}
                data-test-subj="merge-review-details"
              >
                <PreviewDetails
                  fields={fields}
                  merged={merged}
                  showAssignees={showAssignees}
                  originOf={originOf}
                />
              </div>
            </div>
          </EuiPanel>
        </section>
      </div>
    );
  }
);
ReviewStep.displayName = 'ReviewStep';
