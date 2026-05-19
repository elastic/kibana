import { Comparator } from './comparator_types';
export declare const getComparatorScript: (comparator: Comparator, threshold: number[], fieldName: string) => string;
export declare function getHumanReadableComparator(comparator: Comparator): string | undefined;
