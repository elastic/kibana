import type { UseEuiTheme } from '@elastic/eui';
import type { MinimalStepStatus } from './horizontal_minimal_stepper';
export declare const useHorizontalMinimalStepperStyles: ({ euiTheme }: UseEuiTheme) => {
    indicatorByStatus: Record<MinimalStepStatus, import("@emotion/react").SerializedStyles>;
    indicatorRow: import("@emotion/react").SerializedStyles;
};
