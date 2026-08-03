import type { FC } from 'react';
import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import type { UseTableState } from '@kbn/ml-in-memory-table';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { EventRate } from '../use_categorize_request';
interface Props {
    categories: Category[];
    eventRate: EventRate;
    mouseOver?: {
        pinnedCategory: Category | null;
        setPinnedCategory: (category: Category | null) => void;
        highlightedCategory: Category | null;
        setHighlightedCategory: (category: Category | null) => void;
    };
    setSelectedCategories: (category: Category[]) => void;
    tableState: UseTableState<Category>;
    actions: Array<Action<Category>>;
    enableRowActions?: boolean;
    displayExamples?: boolean;
    selectable?: boolean;
    onRenderComplete?: () => void;
}
export declare const CategoryTable: FC<Props>;
export {};
