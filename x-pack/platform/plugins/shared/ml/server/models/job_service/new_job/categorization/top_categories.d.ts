import type { Category } from '@kbn/ml-common-types/categories';
import type { MlClient } from '../../../../lib/ml_client';
export declare function topCategoriesProvider(mlClient: MlClient): {
    topCategories: (jobId: string, numberOfCategories: number) => Promise<{
        total: number;
        categories: {
            category: Category;
        }[];
    }>;
};
