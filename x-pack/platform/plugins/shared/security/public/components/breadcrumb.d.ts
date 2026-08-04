import type { EuiBreadcrumb } from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import type { ChromeStart } from '@kbn/core/public';
export interface BreadcrumbProps extends EuiBreadcrumb {
    text: string;
}
/**
 * Component that automatically sets breadcrumbs and document title based on the render tree.
 *
 * @example
 * // Breadcrumbs will be set to: "Users > Create"
 * // Document title will be set to: "Create - Users"
 *
 * ```typescript
 * <Breadcrumb text="Users">
 *   <Table />
 *   {showForm && (
 *     <Breadcrumb text="Create">
 *       <Form />
 *     </Breadcrumb>
 *   )}
 * </Breadcrumb>
 * ```
 */
export declare const Breadcrumb: FC<PropsWithChildren<BreadcrumbProps>>;
export interface BreadcrumbsProviderProps {
    onChange?: BreadcrumbsChangeHandler;
}
export type BreadcrumbsChangeHandler = (breadcrumbs: BreadcrumbProps[]) => void;
/**
 * Component that can be used to define any side effects that should occur when breadcrumbs change.
 *
 * By default the breadcrumbs in application chrome are set and the document title is updated.
 *
 * @example
 * ```typescript
 * <Breadcrumbs onChange={(breadcrumbs) => setBreadcrumbs(breadcrumbs)}>
 *   <Breadcrumb text="Users" />
 * </Breadcrumbs>
 * ```
 */
export declare const BreadcrumbsProvider: FC<PropsWithChildren<BreadcrumbsProviderProps>>;
export interface InnerBreadcrumbProps {
    breadcrumb: BreadcrumbProps;
}
export declare const InnerBreadcrumb: FC<PropsWithChildren<InnerBreadcrumbProps>>;
export declare function getDocTitle(breadcrumbs: BreadcrumbProps[], maxBreadcrumbs?: number): string[];
export declare function createBreadcrumbsChangeHandler(chrome: Pick<ChromeStart, 'docTitle' | 'setBreadcrumbs'>, setBreadcrumbs?: (newBreadcrumbs: import("@kbn/core/public").ChromeBreadcrumb[], params?: import("@kbn/core/packages/chrome/browser").ChromeSetBreadcrumbsParams) => void): (breadcrumbs: BreadcrumbProps[]) => void;
