import type { FC } from 'react';
export interface Props {
    isDisabled: boolean;
    onImportComplete: (() => void) | null;
}
export declare const ImportJobsFlyout: FC<Props>;
