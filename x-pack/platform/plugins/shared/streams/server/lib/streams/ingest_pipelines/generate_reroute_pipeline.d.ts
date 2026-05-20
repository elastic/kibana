import type { Streams } from '@kbn/streams-schema';
interface GenerateReroutePipelineParams {
    definition: Streams.WiredStream.Definition;
    excludeDestinations?: Set<string>;
}
export declare function generateReroutePipeline({ definition, excludeDestinations, }: GenerateReroutePipelineParams): {
    id: string;
    processors: {
        reroute: {
            destination: string;
            if: string;
        };
    }[];
    _meta: {
        description: string;
        managed: boolean;
    };
    version: number;
};
export {};
