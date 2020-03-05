/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiLink, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';
interface Props {
  indices: string[] | string | undefined;
}

import { useAppDependencies } from '../index';

export const CollapsibleIndicesList: React.FunctionComponent<Props> = ({ indices }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const [isShowingFullIndicesList, setIsShowingFullIndicesList] = useState<boolean>(false);
  const displayIndices = indices
    ? typeof indices === 'string'
      ? indices.split(',')
      : indices
    : undefined;
  const hiddenIndicesCount =
    displayIndices && displayIndices.length > 10 ? displayIndices.length - 10 : 0;
  return (
    <>
      {displayIndices ? (
        <>
          <EuiText>
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
          </EuiText>
          {hiddenIndicesCount ? (
            <>
              <EuiSpacer size="xs" />
              <EuiLink
                onClick={() =>
                  isShowingFullIndicesList
                    ? setIsShowingFullIndicesList(false)
                    : setIsShowingFullIndicesList(true)
                }
              >
                {isShowingFullIndicesList ? (
                  <FormattedMessage
                    id="xpack.snapshotRestore.indicesList.indicesCollapseAllLink"
                    defaultMessage="Hide {count, plural, one {# index} other {# indices}}"
                    values={{ count: hiddenIndicesCount }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.snapshotRestore.indicesList.indicesExpandAllLink"
                    defaultMessage="Show {count, plural, one {# index} other {# indices}}"
                    values={{ count: hiddenIndicesCount }}
                  />
                )}{' '}
                <EuiIcon type={isShowingFullIndicesList ? 'arrowUp' : 'arrowDown'} />
              </EuiLink>
            </>
          ) : null}
        </>
      ) : (
        <FormattedMessage
          id="xpack.snapshotRestore.indicesList.allIndicesValue"
          defaultMessage="All indices"
        />
      )}
    </>
  );
};
