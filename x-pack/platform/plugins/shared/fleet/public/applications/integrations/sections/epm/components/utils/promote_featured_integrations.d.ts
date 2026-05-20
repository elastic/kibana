import type { PackageListGridProps } from '../package_list_grid';
type Category = PackageListGridProps['selectedCategory'];
export declare function _promoteFeaturedIntegrations(featuredIntegrationsByCategory: Partial<Record<Category, string[]>>, packageList: PackageListGridProps['list'], selectedCategory: Category): import("../../screens/home").IntegrationCardItem[];
export declare const promoteFeaturedIntegrations: (packageList: import("../../screens/home").IntegrationCardItem[], selectedCategory: string) => import("../../screens/home").IntegrationCardItem[];
export {};
