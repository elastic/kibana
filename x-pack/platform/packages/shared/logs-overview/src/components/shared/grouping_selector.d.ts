import React from 'react';
export type Grouping = 'none' | 'categories';
export interface GroupingSelectorProps {
    grouping: Grouping;
    onChangeGrouping: (grouping: Grouping) => void;
}
export declare const GroupingSelector: React.FC<GroupingSelectorProps>;
