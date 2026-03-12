/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButtonGroup,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type PreviewRow, getPreviewDisplayValue } from '../../hooks/preview';
import {
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
} from '../../hooks/field_rule_actions';
import { createAnonymizationReplacementsClient } from '../../../common/services/replacements/client';
import { useResolveAnonymizedValues } from '../../../common/hooks/use_resolve_anonymized_values';
import { useProfileFormContext } from '../../profile_form_context';
import { usePreviewPanelState } from '../../hooks/use_preview_panel_state';

const MASK_TOKEN_PATTERN = /^<[^>]+>$/;

const renderMissingValue = () => (
  <EuiText size="xs" color="subdued">
    <em style={{ opacity: 0.75 }}>
      {i18n.translate('anonymizationUi.profiles.preview.missingValue', {
        defaultMessage: 'Not found in sample JSON',
      })}
    </em>
  </EuiText>
);

const renderCellValue = (
  value: unknown,
  { highlightMaskToken }: { highlightMaskToken: boolean }
) => {
  if (value === undefined) {
    return renderMissingValue();
  }

  const textValue = typeof value === 'string' ? value : JSON.stringify(value);
  if (highlightMaskToken && MASK_TOKEN_PATTERN.test(textValue)) {
    return (
      <EuiBadge color="accent" data-test-subj="anonymizationProfilesPreviewMaskToken">
        {textValue}
      </EuiBadge>
    );
  }

  return textValue;
};

const renderAnonymizedIndicator = (action: PreviewRow['action']) => {
  if (action === FIELD_RULE_ACTION_DENY) {
    return null;
  }

  const isAnonymized = action === FIELD_RULE_ACTION_ANONYMIZE;
  const text = i18n.translate('anonymizationUi.profiles.preview.anonymizedIndicator', {
    defaultMessage: '{isAnonymized, select, true {Yes} other {No}}',
    values: { isAnonymized: String(isAnonymized) },
  });
  const label = i18n.translate('anonymizationUi.profiles.preview.anonymizedAriaLabel', {
    defaultMessage: 'Anonymized: {text}',
    values: { text },
  });

  return (
    <EuiToolTip content={label}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={isAnonymized ? 'eyeClosed' : 'eye'}
            color={isAnonymized ? 'warning' : 'subdued'}
            aria-label={label}
            data-test-subj={
              isAnonymized
                ? 'anonymizationProfilesPreviewAnonymizedIcon-yes'
                : 'anonymizationProfilesPreviewAnonymizedIcon-no'
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{text}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

const renderDeniedIndicator = (action: PreviewRow['action']) => {
  if (action !== FIELD_RULE_ACTION_DENY) {
    return null;
  }

  const text = i18n.translate('anonymizationUi.profiles.preview.deniedIndicator', {
    defaultMessage: 'Denied',
  });
  const label = i18n.translate('anonymizationUi.profiles.preview.deniedAriaLabel', {
    defaultMessage: 'Access policy: {text}',
    values: { text },
  });

  return (
    <EuiToolTip content={label}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="minusInCircleFilled"
            color="danger"
            aria-label={label}
            data-test-subj="anonymizationProfilesPreviewDeniedIcon"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{text}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

export const PreviewPanel = () => {
  const {
    fieldRules,
    regexRules,
    isSubmitting,
    targetType,
    targetId,
    fetchPreviewDocument,
    fetch,
    replacementsId,
    inlineDeanonymizations,
  } = useProfileFormContext();
  const replacementsClient = useMemo(
    () => createAnonymizationReplacementsClient({ fetch }),
    [fetch]
  );
  const { resolveText } = useResolveAnonymizedValues({
    client: replacementsClient,
    replacementsId,
    inlineDeanonymizations,
  });
  const {
    previewViewMode,
    setPreviewViewMode,
    previewValueMode,
    setPreviewValueMode,
    parsedPreviewDocument,
    previewRows,
    transformedPreviewDocument,
    previewDocumentLoadError,
    previewDocumentSource,
    isControlsDisabled,
    isInvalidPreviewJson,
    isEmptyPreviewRows,
  } = usePreviewPanelState({
    fieldRules,
    regexRules,
    isSubmitting,
    targetType,
    targetId,
    fetchPreviewDocument,
  });

  const previewTableColumns = useMemo(
    () => [
      {
        field: 'field',
        name: i18n.translate('anonymizationUi.profiles.preview.table.fieldColumn', {
          defaultMessage: 'Field',
        }),
      },
      {
        field: 'action',
        name: i18n.translate('anonymizationUi.profiles.preview.table.accessColumn', {
          defaultMessage: 'Access',
        }),
        width: '120px',
        render: (action: PreviewRow['action']) => renderDeniedIndicator(action),
      },
      {
        field: 'action',
        name: i18n.translate('anonymizationUi.profiles.preview.table.anonymizedColumn', {
          defaultMessage: 'Anonymized',
        }),
        width: '130px',
        render: (action: PreviewRow['action']) => renderAnonymizedIndicator(action),
      },
      {
        field: 'value',
        name: i18n.translate('anonymizationUi.profiles.preview.table.valueColumn', {
          defaultMessage: 'Value',
        }),
        render: (_: unknown, row: PreviewRow) => {
          if (previewValueMode === 'tokens' && row.action === FIELD_RULE_ACTION_DENY) {
            return null;
          }

          return renderCellValue(
            getPreviewDisplayValue({
              row,
              showAnonymizedValues: previewValueMode === 'tokens',
              resolveText,
            }),
            {
              highlightMaskToken: previewValueMode === 'tokens',
            }
          );
        },
      },
    ],
    [previewValueMode, resolveText]
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('anonymizationUi.profiles.preview.title', {
            defaultMessage: 'Preview',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {!previewDocumentLoadError &&
      previewDocumentSource === 'target' &&
      fetchPreviewDocument &&
      targetId.trim() ? (
        <>
          <EuiCallOut
            announceOnMount
            color="success"
            iconType="check"
            title={i18n.translate('anonymizationUi.profiles.preview.loadedFromTarget', {
              defaultMessage: 'Loaded sample JSON from the selected target.',
            })}
            size="s"
            data-test-subj="anonymizationProfilesPreviewInputLoadedFromTarget"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      {previewDocumentLoadError ? (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={previewDocumentLoadError}
            size="s"
            data-test-subj="anonymizationProfilesPreviewInputFallbackInfo"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}

      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('anonymizationUi.profiles.preview.valueModeLegend', {
              defaultMessage: 'Displayed values',
            })}
            options={[
              {
                id: 'original',
                label: i18n.translate('anonymizationUi.profiles.preview.valueMode.original', {
                  defaultMessage: 'Original values',
                }),
              },
              {
                id: 'tokens',
                label: i18n.translate('anonymizationUi.profiles.preview.valueMode.tokens', {
                  defaultMessage: 'Anonymized',
                }),
              },
            ]}
            idSelected={previewValueMode}
            onChange={(value) => setPreviewValueMode(value as 'original' | 'tokens')}
            buttonSize="compressed"
            isDisabled={isControlsDisabled}
            type="single"
            data-test-subj="anonymizationProfilesPreviewValueMode"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('anonymizationUi.profiles.preview.viewModeLegend', {
              defaultMessage: 'Preview view mode',
            })}
            options={[
              {
                id: 'table',
                label: i18n.translate('anonymizationUi.profiles.preview.viewMode.table', {
                  defaultMessage: 'Table',
                }),
              },
              {
                id: 'json',
                label: i18n.translate('anonymizationUi.profiles.preview.viewMode.json', {
                  defaultMessage: 'JSON',
                }),
              },
            ]}
            idSelected={previewViewMode}
            onChange={(value) => setPreviewViewMode(value as 'table' | 'json')}
            buttonSize="compressed"
            isDisabled={isControlsDisabled}
            type="single"
            data-test-subj="anonymizationProfilesPreviewViewMode"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      {isInvalidPreviewJson ? (
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          title={i18n.translate('anonymizationUi.profiles.preview.invalidJsonTitle', {
            defaultMessage: 'Preview JSON is invalid.',
          })}
        />
      ) : isEmptyPreviewRows ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('anonymizationUi.profiles.preview.emptyRowsMessage', {
              defaultMessage: 'No preview rows to show.',
            })}
          </p>
        </EuiText>
      ) : previewViewMode === 'json' ? (
        <EuiCodeBlock
          isCopyable
          language="json"
          fontSize="s"
          data-test-subj="anonymizationProfilesPreviewJsonOutput"
        >
          {JSON.stringify(
            previewValueMode === 'tokens' ? transformedPreviewDocument : parsedPreviewDocument,
            null,
            2
          )}
        </EuiCodeBlock>
      ) : (
        <EuiBasicTable
          tableCaption={i18n.translate('anonymizationUi.profiles.preview.table.caption', {
            defaultMessage: 'Preview field policy results',
          })}
          items={previewRows}
          columns={previewTableColumns}
          compressed
          data-test-subj="anonymizationProfilesPreviewTable"
        />
      )}
    </>
  );
};
