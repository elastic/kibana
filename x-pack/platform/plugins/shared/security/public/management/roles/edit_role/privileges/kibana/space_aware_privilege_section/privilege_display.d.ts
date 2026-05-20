import type { PropsOf } from '@elastic/eui';
import type { EuiText } from '@elastic/eui';
import type { FC } from 'react';
interface Props extends PropsOf<typeof EuiText> {
    privilege: string | string[] | undefined;
    'data-test-subj'?: string;
}
export declare const PrivilegeDisplay: FC<Props>;
export {};
