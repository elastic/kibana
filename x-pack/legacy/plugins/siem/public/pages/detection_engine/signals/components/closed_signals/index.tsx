/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../components/detection_engine/utility_bar';
import * as i18n from '../../translations';

export const ClosedSignals = React.memo<{ totalCount: number }>(({ totalCount }) => {
  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{`${i18n.PANEL_SUBTITLE_SHOWING}: ${totalCount} signals`}</UtilityBarText>
          </UtilityBarGroup>
        </UtilityBarSection>

        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={() => <p>{'Customize columns context menu here.'}</p>}
            >
              {'Customize columns'}
            </UtilityBarAction>

            <UtilityBarAction iconType="indexMapping">{'Aggregate data'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Michael: Closed signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
    </>
  );
});
