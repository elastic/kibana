/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescribedFormGroup, type EuiDescribedFormGroupProps } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * A collapsible version of EuiDescribedFormGroup. Use the `narrow` prop
 * to obtain a vertical layout suitable for smaller forms
 */
export const ResponsiveFormGroup = ({
  narrow = true,
  ...rest
}: EuiDescribedFormGroupProps & { narrow?: boolean }) => {
  const props: EuiDescribedFormGroupProps = {
    ...rest,
    ...(narrow
      ? {
          fullWidth: true,
          css: css`
            flex-direction: column;
            align-items: stretch;
          `,
          gutterSize: 's',
        }
      : {}),
  };
  return <EuiDescribedFormGroup {...props} />;
};
