import type { FC, PropsWithChildren } from 'react';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';
interface Props {
    dataTestSubj?: string;
    grow?: EuiFlexItemProps['grow'];
    className?: string;
}
export declare const ExpandedRowPanel: FC<PropsWithChildren<Props>>;
export {};
