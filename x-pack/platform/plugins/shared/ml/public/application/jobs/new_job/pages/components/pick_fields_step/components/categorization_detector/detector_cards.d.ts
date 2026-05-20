import type { FC } from 'react';
interface CardProps {
    onClick: () => void;
    isSelected: boolean;
}
export declare const CountCard: FC<CardProps>;
export declare const HighCountCard: FC<CardProps>;
export declare const RareCard: FC<CardProps>;
export {};
