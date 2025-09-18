import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useSharedDetailsStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    shardDetails: css`
      line-height: 1;
      overflow-wrap: break-word;

      h3 {
        font-size: ${euiTheme.size.base};
      }

      &:disabled {
        text-decoration: none !important;
        cursor: default;
      }
    `,
    shardDetailsDim: css`
      small {
        color: ${euiTheme.colors.darkShade};
      }
    `,
  };
};
