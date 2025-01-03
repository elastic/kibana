/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';

export const TimeRangeSelectorWrapper: FC<PropsWithChildren> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const style = {
    '.time-range-section-title': {
      fontWeight: 'bold',
      marginBottom: euiTheme.size.s,
    },
    '.time-range-section': {
      flex: '50%',
      padding: `0 ${euiTheme.size.s}`,
      borderRight: euiTheme.border.thin,
    },

    '.tab-stack': {
      marginBottom: 0,
      paddingLeft: 0,
      listStyle: 'none',

      '& > li': {
        float: 'none',
        position: 'relative',
        display: 'block',
        marginBottom: euiTheme.size.xs,

        '& > a': {
          position: 'relative',
          display: 'block',
          padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
          borderRadius: euiTheme.border.radius.medium,
        },
        '& > a:hover': {
          backgroundColor: euiTheme.colors.lightestShade,
        },
        '.body': {
          display: 'none',
        },
      },
      '& > li.active': {
        '& > a': {
          color: euiTheme.colors.emptyShade,
          backgroundColor: euiTheme.colors.primary,
        },
        '.body': {
          display: 'block',
          '.euiFieldText': {
            borderRadius: `0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium}`,
          },
        },
      },
      '& > li.has-body.active': {
        '& > a': {
          borderRadius: `${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0`,
        },
        '.react-datepicker': {
          borderRadius: `0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium}`,
          borderTop: 'none',
        },
      },
    },
    '.time-range-section:last-child': {
      borderRight: 'none',
    },
  };

  // @ts-expect-error style object strings cause a type error
  return <div css={style}>{children}</div>;
};
