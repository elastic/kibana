import type { FC } from 'react';
interface HeaderProps {
    canCreate: boolean;
    onCreate: () => void;
}
export declare const Header: FC<HeaderProps>;
export {};
