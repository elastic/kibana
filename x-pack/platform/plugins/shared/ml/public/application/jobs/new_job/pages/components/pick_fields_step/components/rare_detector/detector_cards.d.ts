import type { FC } from 'react';
interface CardProps {
    onClick: () => void;
    isSelected: boolean;
}
export declare const RareCard: FC<CardProps>;
export declare const RareInPopulationCard: FC<CardProps>;
export declare const FrequentlyRareInPopulationCard: FC<CardProps>;
export {};
