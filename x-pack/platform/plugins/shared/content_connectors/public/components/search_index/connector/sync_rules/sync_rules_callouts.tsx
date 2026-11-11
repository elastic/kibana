/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringValidationState } from '@kbn/search-connectors';
import { KbnDangerCallout, KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';

interface FilteringStatusCalloutsProps {
  applyDraft: () => void;
  editDraft: () => void;
  state: FilteringValidationState;
}

export const SyncRulesStateCallouts: React.FC<FilteringStatusCalloutsProps> = ({
  applyDraft,
  editDraft,
  state,
}) => {
  switch (state) {
    case FilteringValidationState.EDITED:
      return (
        <KbnWarningCallout
          title={
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate(
                  'xpack.contentConnectors.index.connector.syncRules.validatingTitle',
                  {
                    defaultMessage: 'Draft sync rules are validating',
                  }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          text={i18n.translate(
            'xpack.contentConnectors.index.connector.syncRules.validatingDescription',
            {
              defaultMessage:
                'Draft rules need to be validated before they can be activated. This may take a few minutes.',
            }
          )}
          actionProps={{
            primary: {
              'data-test-subj': 'contentConnectorsSyncRulesStateCalloutsEditDraftRulesButton',
              'data-telemetry-id':
                'entSearchContent-connector-syncRules-validatingCallout-editRules',
              onClick: editDraft,
              children: i18n.translate(
                'xpack.contentConnectors.index.connector.syncRules.validatingCallout.editDraftRulesTitle',
                {
                  defaultMessage: 'Edit draft rules',
                }
              ),
            },
          }}
        />
      );
    case FilteringValidationState.INVALID:
      return (
        <KbnDangerCallout
          title={i18n.translate('xpack.contentConnectors.index.connector.syncRules.invalidTitle', {
            defaultMessage: 'Draft sync rules are invalid',
          })}
          text={i18n.translate(
            'xpack.contentConnectors.index.connector.syncRules.invalidDescription',
            {
              defaultMessage:
                'Draft rules did not validate. Edit the draft rules before they can be activated.',
            }
          )}
          actionProps={{
            primary: {
              'data-test-subj': 'contentConnectorsSyncRulesStateCalloutsEditDraftRulesButton',
              'data-telemetry-id': 'entSearchContent-connector-syncRules-errorCallout-editRules',
              onClick: editDraft,
              children: i18n.translate(
                'xpack.contentConnectors.index.connector.syncRules.errorCallout.editDraftRulesTitle',
                {
                  defaultMessage: 'Edit draft rules',
                }
              ),
            },
          }}
        />
      );
    case FilteringValidationState.VALID:
      return (
        <KbnSuccessCallout
          title={i18n.translate(
            'xpack.contentConnectors.index.connector.syncRules.validatedTitle',
            {
              defaultMessage: 'Draft sync rules validated',
            }
          )}
          text={i18n.translate(
            'xpack.contentConnectors.index.connector.syncRules.validatedDescription',
            {
              defaultMessage: 'Activate draft rules to take effect on the next sync.',
            }
          )}
          actionProps={{
            primary: {
              'data-test-subj': 'contentConnectorsSyncRulesStateCalloutsActivateDraftRulesButton',
              'data-telemetry-id': 'entSearchContent-connector-syncRules-successCallout-applyRules',
              onClick: applyDraft,
              children: i18n.translate(
                'xpack.contentConnectors.index.connector.syncRules.successCallout.applyDraftRulesTitle',
                {
                  defaultMessage: 'Activate draft rules',
                }
              ),
            },
            secondary: {
              'data-test-subj': 'contentConnectorsSyncRulesStateCalloutsEditDraftRulesButton',
              'data-telemetry-id': 'entSearchContent-connector-syncRules-successCallout-editRules',
              onClick: editDraft,
              children: i18n.translate(
                'xpack.contentConnectors.index.connector.syncRules.errorCallout.successEditDraftRulesTitle',
                {
                  defaultMessage: 'Edit draft rules',
                }
              ),
            },
          }}
        />
      );
    default:
      return <></>;
  }
};
