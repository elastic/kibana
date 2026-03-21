import type { FC, ReactNode } from 'react';
import React from 'react';
import type { Query } from '@elastic/eui';
import type { TagsCapabilities } from '../../../common';
import type { TagWithRelations } from '../../../common/types';
import type { TagAction } from '../actions';
interface TagTableProps {
    loading: boolean;
    capabilities: TagsCapabilities;
    tags: TagWithRelations[];
    initialQuery?: Query;
    allowSelection: boolean;
    onQueryChange: (query?: Query) => void;
    selectedTags: TagWithRelations[];
    onSelectionChange: (selection: TagWithRelations[]) => void;
    getTagRelationUrl: (tag: TagWithRelations) => string;
    onShowRelations: (tag: TagWithRelations) => void;
    actions: TagAction[];
    actionBar: ReactNode;
}
export declare const isModifiedOrPrevented: (event: React.MouseEvent) => boolean;
export declare const TagTable: FC<TagTableProps>;
export {};
