/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiDescriptionListDescription,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/target/types/react';

interface Props {
  indices: string[] | string;
  defaultState: boolean;
  i18nId: string;
}

export const ShowHideIndices: React.FunctionComponent<Props> = ({
  indices,
  defaultState,
  i18nId,
}) => {
  const [isShowingFullIndicesList, setIsShowingFullIndicesList] = useState<boolean>(defaultState);
  const displayIndices = indices
    ? typeof indices === 'string'
      ? indices.split(',')
      : indices
    : undefined;
  const hiddenIndicesCount =
    displayIndices && displayIndices.length > 10 ? displayIndices.length - 10 : 0;
  return (
    <EuiDescriptionListDescription>
      {displayIndices ? (
        <div>
          <ul>
            {(isShowingFullIndicesList ? displayIndices : [...displayIndices].splice(0, 10)).map(
              index => (
                <li key={index}>
                  <EuiTitle size="xs">
                    <span>{index}</span>
                  </EuiTitle>
                </li>
              )
            )}
          </ul>
          <EuiSpacer size="xs" />
          {hiddenIndicesCount ? (
            <EuiText>
              <EuiLink onClick={() => setIsShowingFullIndicesList(false)}>
                <FormattedMessage
                  id={i18nId}
                  defaultMessage={
                    isShowingFullIndicesList
                      ? 'Show'
                      : 'Hide' + '{count, plural, one {# index} other {# indices}}'
                  }
                  values={{ count: hiddenIndicesCount }}
                />{' '}
                <EuiIcon type="arrowUp" />
              </EuiLink>
            </EuiText>
          ) : null}
        </div>
      ) : (
        <FormattedMessage
          id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.allIndicesValue"
          defaultMessage="All indices"
        />
      )}
    </EuiDescriptionListDescription>
  );
};
