interface Breadcrumb {
    text: string;
    href?: string;
}
export declare function init(setGlobalBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void): void;
export declare function setBreadcrumbs(type: 'home' | 'add' | 'edit', queryParams?: string): void;
export {};
