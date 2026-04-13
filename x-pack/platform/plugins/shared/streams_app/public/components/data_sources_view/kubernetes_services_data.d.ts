export type K8sCategory = 'Workloads' | 'Infrastructure' | 'Networking' | 'Security' | 'Performance';
export declare const K8S_CATEGORY_COLORS: Record<K8sCategory, string>;
export interface K8sComponent {
    id: string;
    name: string;
    logoUrl: string;
    category: K8sCategory;
    useCase: string;
    description: string;
    badge?: string;
}
export declare const K8S_COMPONENTS: K8sComponent[];
