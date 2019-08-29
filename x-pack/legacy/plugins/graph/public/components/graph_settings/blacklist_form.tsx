/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { GraphSettingsProps } from './graph_settings';
import { LegacyIcon } from './legacy_icon';

export function BlacklistForm({
  blacklistedNodes,
  unblacklistNode,
}: Pick<GraphSettingsProps, 'blacklistedNodes' | 'unblacklistNode'>) {
  return (
    <>
      {blacklistedNodes.length > 0 ? (
        <EuiText size="s">
          {i18n.translate('xpack.graph.blacklist.description', {
            defaultMessage:
              'The nodes listed here will not show up through searches. Delete them from this list and submit new searches to add them to the workspace again.',
          })}
        </EuiText>
      ) : (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.graph.blacklist.noEntriesDescription"
              defaultMessage="You don't have any blacklisted nodes. Select nodes and press the {stopSign} in the side bar to blacklist them."
              values={{ stopSign: <span className="kuiIcon fa-ban"></span> }}
            />
          }
        />
      )}
      <EuiListGroup>
        {blacklistedNodes.map(node => (
          <EuiListGroupItem
            icon={
              <>
                <LegacyIcon icon={node.icon} />
                &nbsp;
              </>
            }
            // TODO this is not enough to be unique
            key={node.label}
            label={node.label}
            extraAction={{
              iconType: 'trash',
              'aria-label': i18n.translate('xpack.graph.blacklist.removeLabel', {
                defaultMessage: 'Remove',
              }),
              alwaysShow: true,
              onClick: () => {
                unblacklistNode(node);
              },
            }}
          />
        ))}
      </EuiListGroup>
      <EuiSpacer />
      {blacklistedNodes.length > 0 && (
        <EuiButton
          iconType="trash"
          onClick={() => {
            blacklistedNodes.forEach(node => {
              unblacklistNode(node);
            });
          }}
        >
          {i18n.translate('xpack.graph.settings.blacklist.clearButtonLabel', {
            defaultMessage: 'Clear',
          })}
        </EuiButton>
      )}
    </>
  );
}
