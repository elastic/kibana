/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiDescriptionList, EuiSpacer, EuiText } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import { InfoBlocks } from '@kbn/flyout-info-blocks';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';
import { getEmptyCellValue } from '../../../empty_value';
import { metadataToPairs } from '../../observable_metadata_fields';
import type { ObservablePatch } from '../../../../../common/types/api';
import type { ObservableFlyoutPanelProps } from '../use_observable_flyout_api';
import { useObservableFlyoutApi } from '../use_observable_flyout_api';
import { ObservableCasesOverview } from './observable_cases_overview';
import { useCurrentObservable } from './use_current_observable';
import { useObservableFlyoutActions } from './use_observable_flyout_actions';
import { useAddObservableToChat } from '../../../../agent_builder/use_add_observable_to_chat';
import { ADD_TO_CHAT } from '../../../../agent_builder/translations';
import * as i18n from '../translations';

// Descriptions and metadata values are free text, so they wrap instead of truncating.
const wrapCss = css`
  word-break: break-word;
`;

/**
 * The main panel of the observable flyout. It keeps apart what belongs to the observable in this
 * case and what every case of the space holding the value shares, then shows insights such as
 * the other cases holding it.
 */
export const ObservableFlyout = ({
  observable: initialObservable,
  caseData,
  typeLabel,
  onClose,
}: ObservableFlyoutPanelProps) => {
  const { openObservableCases } = useObservableFlyoutApi();
  const { observable, onValueChanged } = useCurrentObservable(caseData.id, initialObservable);
  const { typeKey, value, description, createdAt, updatedAt, metadata } = observable;

  const onObservableUpdated = useCallback(
    ({ value: nextValue }: ObservablePatch) => onValueChanged(nextValue),
    [onValueChanged]
  );
  const { panels: actionPanels, modal } = useObservableFlyoutActions({
    caseData,
    observable,
    onObservableUpdated,
  });
  const chatContext = useMemo(
    () => ({ observable, caseData, typeLabel }),
    [caseData, observable, typeLabel]
  );
  const { addToChat, isAddToChatAvailable } = useAddObservableToChat(chatContext);

  const onShowCases = useCallback(
    () => openObservableCases({ observable, caseData, typeLabel }),
    [caseData, observable, openObservableCases, typeLabel]
  );

  const caseBlocks: InfoBlockItem[] = useMemo(
    () => [
      {
        id: 'createdAt',
        title: i18n.DATE_ADDED,
        value: <FormattedRelativePreferenceDate value={createdAt} stripMs />,
        'data-test-subj': 'cases-observable-flyout-date-added',
      },
      {
        id: 'updatedAt',
        title: i18n.LAST_UPDATED,
        value: updatedAt ? (
          <FormattedRelativePreferenceDate value={updatedAt} stripMs />
        ) : (
          getEmptyCellValue()
        ),
        'data-test-subj': 'cases-observable-flyout-last-updated',
      },
    ],
    [createdAt, updatedAt]
  );

  // An open-ended set of keys that changes over time, so a list rather than one block per key.
  const metadataItems: NonNullable<EuiDescriptionListProps['listItems']> = useMemo(
    () =>
      metadataToPairs(metadata).map(({ key, value: metadataValue }) => ({
        title: (
          <span css={wrapCss} data-test-subj={`cases-observable-flyout-metadata-key-${key}`}>
            {key}
          </span>
        ),
        description: (
          <span css={wrapCss} data-test-subj={`cases-observable-flyout-metadata-value-${key}`}>
            {metadataValue}
          </span>
        ),
      })),
    [metadata]
  );

  return (
    <>
      <FlyoutTemplate onClose={onClose}>
        <FlyoutTemplate.Header title={value}>
          <FlyoutTemplate.Header.Badge color="hollow" data-test-subj="cases-observable-flyout-type">
            {typeLabel ?? typeKey}
          </FlyoutTemplate.Header.Badge>
        </FlyoutTemplate.Header>
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section
            title={i18n.CASE_FIELDS_SECTION}
            tooltip={i18n.CASE_FIELDS_HELP}
            data-test-subj="cases-observable-flyout-case-fields"
          >
            <InfoBlocks
              items={caseBlocks}
              maxColumns={2}
              data-test-subj="cases-observable-flyout-case-blocks"
            />
            {description ? (
              <>
                <EuiSpacer size="m" />
                <EuiText size="xs" color="subdued">
                  {i18n.DESCRIPTION}
                </EuiText>
                <EuiText
                  size="s"
                  css={wrapCss}
                  data-test-subj="cases-observable-flyout-description"
                >
                  <p>{description}</p>
                </EuiText>
              </>
            ) : null}
          </FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Section
            title={i18n.SHARED_FIELDS_SECTION}
            tooltip={i18n.SHARED_FIELDS_HELP}
            hasBorder
            data-test-subj="cases-observable-flyout-shared-fields"
          >
            {metadataItems.length > 0 ? (
              <EuiDescriptionList
                type="column"
                compressed
                rowGutterSize="s"
                columnGutterSize="m"
                columnWidths={[1, 2]}
                listItems={metadataItems}
                data-test-subj="cases-observable-flyout-metadata"
              />
            ) : (
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="cases-observable-flyout-no-metadata"
              >
                <p>{i18n.NO_SHARED_METADATA}</p>
              </EuiText>
            )}
          </FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Section
            title={i18n.INSIGHTS_SECTION}
            data-test-subj="cases-observable-flyout-insights"
          >
            <ObservableCasesOverview
              observable={observable}
              caseData={caseData}
              onShowCases={onShowCases}
            />
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          {isAddToChatAvailable && (
            <FlyoutTemplate.Footer.SecondaryAction
              variant="ai"
              iconType="productAgent"
              label={ADD_TO_CHAT}
              onClick={addToChat}
              data-test-subj="cases-observable-flyout-add-to-chat"
            />
          )}
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={i18n.TAKE_ACTION}
            panels={actionPanels}
            data-test-subj="cases-observable-flyout-take-action"
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
      {modal}
    </>
  );
};

ObservableFlyout.displayName = 'ObservableFlyout';
