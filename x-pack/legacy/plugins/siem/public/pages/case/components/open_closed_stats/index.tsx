/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as i18n from '../all_cases/translations';

export interface Props {
  open?: number;
  closed?: number;
}

export const OpenClosedStats = React.memo<Props>(({ closed, open }) => {
  const openClosedStats = useMemo(
    () =>
      open
        ? [
            {
              title: i18n.OPEN_CASES,
              description: open as number,
            },
          ]
        : [
            {
              title: i18n.CLOSED_CASES,
              description: closed as number,
            },
          ],
    [open, closed]
  );
  return <EuiDescriptionList textStyle="reverse" listItems={openClosedStats} />;
});

OpenClosedStats.displayName = 'OpenClosedStats';
