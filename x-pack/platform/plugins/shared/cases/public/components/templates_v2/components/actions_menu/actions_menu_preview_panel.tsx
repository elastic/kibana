/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { stringify as yamlStringify } from 'yaml';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ActionOptionData, ConfigurableFieldAction } from './types';
import { isActionCategory, isConfigurableFieldAction, isLeafAction } from './types';
import * as i18nStrings from '../../translations';

interface ActionsMenuPreviewPanelProps {
  hoveredOption: ActionOptionData | null;
  onSelect: (action: ActionOptionData) => void;
  onAdd: (action: ActionOptionData) => void;
  onConfigureAndAdd?: (action: ConfigurableFieldAction) => void;
  /** Pin leaf detail; when `parentSection` is set, also navigate left into that category. */
  onPinPreview?: (action: ActionOptionData, parentSection?: ActionOptionData) => void;
}

const getExampleYaml = (action: ActionOptionData): string | undefined => {
  try {
    if (action.kind === 'fieldType') {
      return yamlStringify(action.scaffold).trim();
    }
    if (action.kind === 'libraryField') {
      return yamlStringify({ $ref: action.fieldName }).trim();
    }
    if (action.kind === 'rule') {
      return yamlStringify({
        [action.rule.blockKey]: { [action.rule.ruleKey]: action.rule.value },
      }).trim();
    }
  } catch {
    return undefined;
  }
  return undefined;
};

export function ActionsMenuPreviewPanel({
  hoveredOption,
  onSelect,
  onAdd,
  onConfigureAndAdd,
  onPinPreview,
}: ActionsMenuPreviewPanelProps) {
  const styles = useMemoCss(panelStyles);

  if (!hoveredOption) {
    return <DefaultPanel />;
  }

  if (isActionCategory(hoveredOption)) {
    return (
      <SectionPreviewPanel
        section={hoveredOption}
        onSelect={onSelect}
        onAdd={onAdd}
        onPinPreview={onPinPreview}
        styles={styles}
      />
    );
  }

  return (
    <LeafDetailPanel
      action={hoveredOption}
      onAdd={() => onAdd(hoveredOption)}
      onConfigureAndAdd={
        onConfigureAndAdd && isConfigurableFieldAction(hoveredOption)
          ? () => onConfigureAndAdd(hoveredOption)
          : undefined
      }
      styles={styles}
    />
  );
}

function DefaultPanel() {
  const styles = useMemoCss(defaultPanelStyles);
  return (
    <div css={styles.root}>
      <div css={styles.hero}>
        <p css={styles.heroText}>
          <FormattedMessage
            id="xpack.cases.templates.actionsMenu.preview.selectAction"
            defaultMessage="Select an action to get started"
          />
          <br />
          <FormattedMessage
            id="xpack.cases.templates.actionsMenu.preview.selectActionDesc"
            defaultMessage="Choose an item from the list to see its description and add it to the template."
          />
        </p>
      </div>
    </div>
  );
}

function SectionPreviewPanel({
  section,
  onSelect,
  onAdd,
  onPinPreview,
  styles,
}: {
  section: Extract<ActionOptionData, { kind: 'category' }>;
  onSelect: (action: ActionOptionData) => void;
  onAdd: (action: ActionOptionData) => void;
  onPinPreview?: (action: ActionOptionData, parentSection?: ActionOptionData) => void;
  styles: ReturnType<typeof useMemoCss<typeof panelStyles>>;
}) {
  const steps = useMemo(
    () =>
      [...section.options].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true })
      ),
    [section.options]
  );
  const hideInfo = section.id === 'newField';

  return (
    <div css={styles.sectionPanel}>
      <div css={styles.sectionTitle}>
        <p css={styles.titleBlockText}>{section.label}</p>
        {(section.disabledReason || section.description) && (
          <p css={styles.descriptionText}>{section.disabledReason ?? section.description}</p>
        )}
      </div>
      {section.disabled ? null : steps.length === 0 ? (
        <div css={styles.emptySection}>
          <EuiText size="s" color="subdued">
            {section.id === 'fieldLibrary'
              ? i18nStrings.ACTIONS_MENU_NO_LIBRARY_FIELDS
              : i18n.translate('xpack.cases.templates.actionsMenu.preview.emptyCategory', {
                  defaultMessage: 'No items in this category.',
                })}
          </EuiText>
        </div>
      ) : (
        <div css={styles.stepListScroll}>
          <div css={styles.stepList}>
            {steps.map((step) => (
              <PreviewStepRow
                key={step.id}
                step={step}
                hideInfo={hideInfo || step.kind === 'fieldType'}
                onClick={() => onSelect(step)}
                onAdd={isLeafAction(step) && !step.disabled ? () => onAdd(step) : undefined}
                onPinPreview={
                  !hideInfo && onPinPreview && isLeafAction(step)
                    ? () => onPinPreview(step, section)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeafDetailPanel({
  action,
  onAdd,
  onConfigureAndAdd,
  styles,
}: {
  action: ActionOptionData;
  onAdd: () => void;
  onConfigureAndAdd?: () => void;
  styles: ReturnType<typeof useMemoCss<typeof panelStyles>>;
}) {
  const exampleYaml = useMemo(() => getExampleYaml(action), [action]);
  const canAdd = !action.disabled;
  const description = action.disabledReason ?? action.description;

  return (
    <div css={styles.panel}>
      <div css={styles.titleBlock}>
        <p css={styles.titleBlockText}>{action.label}</p>
        {description && <p css={styles.descriptionText}>{description}</p>}
        {canAdd && (
          <EuiFlexGroup alignItems="center" gutterSize="m" css={styles.detailActions} wrap>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="plus"
                flush="left"
                onClick={onAdd}
                data-test-subj="actionsMenuPreviewAdd"
              >
                <FormattedMessage
                  id="xpack.cases.templates.actionsMenu.preview.add"
                  defaultMessage="Add"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {onConfigureAndAdd && isConfigurableFieldAction(action) && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="gear"
                  flush="left"
                  onClick={onConfigureAndAdd}
                  data-test-subj="actionsMenuPreviewConfigureAndAdd"
                >
                  <FormattedMessage
                    id="xpack.cases.templates.actionsMenu.preview.configureAndAdd"
                    defaultMessage="Configure and add"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </div>

      <div css={styles.descriptionSection}>
        <p css={styles.sectionLabel}>
          <FormattedMessage
            id="xpack.cases.templates.actionsMenu.preview.descriptionHeading"
            defaultMessage="Description"
          />
        </p>
        <EuiSpacer size="s" />
        {description ? (
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        ) : (
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.cases.templates.actionsMenu.preview.noDescription"
                defaultMessage="No description available."
              />
            </p>
          </EuiText>
        )}
        {exampleYaml && (
          <>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="yaml" fontSize="s" paddingSize="m" isCopyable overflowHeight={280}>
              {exampleYaml}
            </EuiCodeBlock>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewStepRow({
  step,
  hideInfo,
  onClick,
  onAdd,
  onPinPreview,
}: {
  step: ActionOptionData;
  hideInfo?: boolean;
  onClick: () => void;
  onAdd?: () => void;
  onPinPreview?: () => void;
}) {
  const styles = useMemoCss(previewStepRowStyles);
  const isGroup = isActionCategory(step);
  const showInfo = !hideInfo && onPinPreview;
  const showLeafActions = !isGroup && (onAdd || showInfo) && !step.disabled;

  return (
    <div
      role="button"
      tabIndex={step.disabled ? -1 : 0}
      css={styles.row}
      onClick={step.disabled ? undefined : onClick}
      onKeyDown={
        step.disabled
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
      }
      aria-disabled={step.disabled || undefined}
      data-test-subj={step.testSubj ? `preview-${step.testSubj}` : undefined}
    >
      <span css={styles.info}>
        <span css={styles.labelText}>{step.label}</span>
        {(step.disabledReason || step.description) && (
          <EuiText size="xs" color="subdued" css={styles.description}>
            {step.disabledReason ?? step.description}
          </EuiText>
        )}
      </span>
      {isGroup && (
        <EuiIcon type="arrowRight" size="s" color="subdued" aria-hidden css={styles.chevron} />
      )}
      {showLeafActions && (
        <span className="rowActions" css={styles.rowActions}>
          {showInfo && (
            <EuiButtonIcon
              iconType="info"
              size="m"
              iconSize="m"
              color="text"
              display="empty"
              css={styles.rowActionButton}
              aria-label={i18n.translate('xpack.cases.templates.actionsMenu.viewDetails', {
                defaultMessage: 'View details',
              })}
              data-test-subj="actionsMenuPreviewItemInfo"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onPinPreview?.();
              }}
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
          {onAdd && (
            <EuiButtonIcon
              iconType="plusInCircle"
              size="m"
              iconSize="m"
              color="text"
              display="empty"
              css={styles.rowActionButton}
              aria-label={i18n.translate('xpack.cases.templates.actionsMenu.addItem', {
                defaultMessage: 'Add',
              })}
              data-test-subj="actionsMenuPreviewItemAdd"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
        </span>
      )}
    </div>
  );
}

const defaultPanelStyles = {
  root: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: euiTheme.size.l,
      justifyContent: 'center',
      alignItems: 'center',
    }),
  hero: css({
    textAlign: 'center',
    maxWidth: 320,
  }),
  heroText: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      fontSize: '14px',
      lineHeight: '22px',
      color: euiTheme.colors.textSubdued,
    }),
};

const panelStyles = {
  sectionPanel: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    paddingTop: '12px',
    gap: '16px',
  }),
  sectionTitle: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '0 16px',
  }),
  emptySection: css({
    padding: '0 16px 16px',
  }),
  stepListScroll: css({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '0 0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  }),
  stepList: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 auto',
      alignSelf: 'flex-start',
      boxSizing: 'border-box',
      width: 'calc(100% - 16px)',
      borderRadius: euiTheme.border.radius.medium,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
    }),
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      borderRadius: '4px',
      padding: `12px 16px 16px 16px`,
      gap: euiTheme.size.base,
    }),
  titleBlock: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }),
  titleBlockText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: euiTheme.font.weight.bold,
      lineHeight: '24px',
      color: euiTheme.colors.textParagraph,
      margin: 0,
    }),
  detailActions: css({
    marginTop: '2px',
  }),
  descriptionText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: '18px',
      color: euiTheme.colors.textSubdued,
      margin: 0,
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 3,
      overflow: 'hidden',
    }),
  descriptionSection: css({
    flex: 1,
    minHeight: 0,
  }),
  sectionLabel: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: 0,
      fontSize: '12px',
      fontWeight: euiTheme.font.weight.bold,
      lineHeight: '18px',
      color: euiTheme.colors.textParagraph,
    }),
};

const previewStepRowStyles = {
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      padding: '12px 16px',
      border: 'none',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      borderRadius: 0,
      background: 'transparent',
      textAlign: 'left',
      cursor: 'pointer',
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
      '&:hover .rowActions, &:focus-within .rowActions': {
        opacity: 1,
        pointerEvents: 'auto',
      },
      '&:disabled, &[aria-disabled="true"]': {
        cursor: 'not-allowed',
        opacity: 0.6,
      },
    }),
  info: css({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }),
  labelText: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '14px',
      fontWeight: euiTheme.font.weight.medium,
      lineHeight: '20px',
      color: euiTheme.colors.textParagraph,
    }),
  description: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  chevron: css({
    flexShrink: 0,
  }),
  rowActions: css({
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
    opacity: 0,
    pointerEvents: 'none',
  }),
  rowActionButton: css({
    inlineSize: '32px',
    blockSize: '32px',
    width: '32px',
    height: '32px',
  }),
};
