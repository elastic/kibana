export type ServiceCategory = 'Infrastructure' | 'Security' | 'Performance' | 'Reliability' | 'Cost' | 'AI Ops' | 'Compliance' | 'Custom';
export declare const CATEGORY_COLORS: Record<ServiceCategory, string>;
export interface AwsService {
    id: string;
    name: string;
    logoUrl: string;
    category: ServiceCategory;
    useCase: string;
    description: string;
    packageName: string;
    agentless?: boolean;
    badge?: string;
}
export declare const AWS_SERVICES: AwsService[];
