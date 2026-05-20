export interface UrlCategories {
    category: string;
    subCategory?: string;
}
export declare function useUrlCategories(): UrlCategories;
export declare function useSetUrlCategory(): (update: {
    category?: string;
    subCategory?: string;
}, options?: {
    replace?: boolean;
}) => void;
