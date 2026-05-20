import type { FC } from 'react';
import type { EuiButtonProps } from '@elastic/eui';
interface Props {
    isDisabled: boolean;
    navigateToSourceSelection: () => void;
    size?: EuiButtonProps['size'];
}
export declare const CreateAnalyticsButton: FC<Props>;
export {};
