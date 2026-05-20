import type { FC } from 'react';
export type EntityCellFilter = (entityName: string, entityValue: string, direction: '+' | '-') => void;
interface EntityCellProps {
    entityName: string;
    entityValue: string;
    filter?: EntityCellFilter;
    wrapText?: boolean;
}
export declare const EntityCell: FC<EntityCellProps>;
export {};
