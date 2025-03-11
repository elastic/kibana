import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const operationsButtonStyles = ({ euiTheme }: UseEuiTheme) => {
  return css`
    > button {
      padding-top: 0;
      padding-bottom: 0;
      min-block-size: ${euiTheme.size.l};
    }
  `;
};
