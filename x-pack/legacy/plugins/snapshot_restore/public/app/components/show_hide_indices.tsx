/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiDescriptionListDescription, EuiTitle, EuiLink, EuiIcon } from '@elastic/eui';
interface Props {
  indices: string[] | string | undefined;
  defaultState: boolean;
  i18nId: string;
}

import { useAppDependencies } from '../index';

export const ShowHideIndices: React.FunctionComponent<Props> = ({
  indices,
  defaultState,
  i18nId,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
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
          {hiddenIndicesCount ? (
            <EuiLink
              onClick={() =>
                isShowingFullIndicesList
                  ? setIsShowingFullIndicesList(false)
                  : setIsShowingFullIndicesList(true)
              }
            >
              <FormattedMessage
                id={isShowingFullIndicesList ? i18nId.replace('Show', 'Collapse') : i18nId}
                defaultMessage={
                  (isShowingFullIndicesList ? 'Hide' : 'Show') +
                  ' {count, plural, one {# index} other {# indices}}'
                }
                values={{ count: hiddenIndicesCount }}
              />{' '}
              <EuiIcon type="arrowUp" />
            </EuiLink>
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
