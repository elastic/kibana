import type { FC } from 'react';
import type { EuiCallOutProps } from '@elastic/eui';
interface Props {
    nodeAvailableCallback?: (mlAvailable: boolean) => void;
    size?: EuiCallOutProps['size'];
}
export declare const MlNodeAvailableWarningShared: FC<Props>;
export {};
