import { type FC } from 'react';
import { type ChangePointType } from './constants';
export type ChangePointUIValue = ChangePointType | undefined;
interface ChangePointTypeFilterProps {
    value: ChangePointType[] | undefined;
    onChange: (changePointType: ChangePointType[] | undefined) => void;
}
export declare const ChangePointTypeFilter: FC<ChangePointTypeFilterProps>;
export {};
