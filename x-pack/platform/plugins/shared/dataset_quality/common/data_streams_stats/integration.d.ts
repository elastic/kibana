import type { IntegrationType } from '../api_types';
export declare class Integration {
    name: IntegrationType['name'];
    title: string;
    version: string;
    datasets: Record<string, string>;
    icons?: IntegrationType['icons'];
    private constructor();
    static create(integration: IntegrationType): Integration;
}
