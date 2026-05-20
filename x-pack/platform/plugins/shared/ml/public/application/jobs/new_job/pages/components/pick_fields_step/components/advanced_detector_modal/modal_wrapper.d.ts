import type { FC, PropsWithChildren } from 'react';
interface Props {
    onCreateClick(): void;
    closeModal(): void;
    saveEnabled: boolean;
}
export declare const ModalWrapper: FC<PropsWithChildren<Props>>;
export {};
