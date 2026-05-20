import type { FC } from 'react';
interface SplitFieldSelectorProps {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    inline?: boolean;
}
export declare const SplitFieldSelector: FC<SplitFieldSelectorProps>;
export {};
