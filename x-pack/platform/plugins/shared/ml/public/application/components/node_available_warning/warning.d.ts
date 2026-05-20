import type { FC } from 'react';
import type { EuiCallOutProps } from '@elastic/eui';
interface Props {
    size?: EuiCallOutProps['size'];
    isCloud: boolean;
    isCloudTrial: boolean;
    deploymentId: string | null;
}
export declare const Warning: FC<Props>;
export {};
