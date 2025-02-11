/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiDescriptionList,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';

import { useStartServices } from '../../../../../hooks';

export const Requirements = memo(() => {
  const { docLinks } = useStartServices();

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          gutterSize="xs"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.fleet.epm.requirementsTitle"
                  defaultMessage="Requirements"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiDescriptionList
          type="column"
          compressed
          listItems={[
            {
              title: i18n.translate('xpack.fleet.epm.requirements.permissionLabel', {
                defaultMessage: 'Permissions',
              }),
              description: (
                <>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.fleet.epm.requirements.permissionRequireRootTooltip',
                      {
                        defaultMessage:
                          'Elastic agent needs to be run with root or administrator privileges',
                      }
                    )}
                  >
                    <FormattedMessage
                      id="xpack.fleet.epm.requirements.permissionRequireRootMessage"
                      defaultMessage="{guideLink}"
                      values={{
                        guideLink: (
                          <EuiLink
                            href={docLinks.links.fleet.unprivilegedMode}
                            target="_blank"
                            external
                          >
                            <FormattedMessage
                              id="xpack.fleet.permissionRequireRootMessage.guideLink"
                              defaultMessage="Root privileges"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiToolTip>
                </>
              ),
            },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
