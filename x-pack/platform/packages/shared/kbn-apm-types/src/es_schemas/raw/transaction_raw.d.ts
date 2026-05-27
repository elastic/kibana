import type { APMBaseDoc } from './apm_base_doc';
import type { Cloud } from './fields/cloud';
import type { Container } from './fields/container';
import type { EventOutcome } from './fields/event_outcome';
import type { Host } from './fields/host';
import type { Http } from './fields/http';
import type { Kubernetes } from './fields/kubernetes';
import type { Page } from './fields/page';
import type { Process } from './fields/process';
import type { Service } from './fields/service';
import type { TimestampUs } from './fields/timestamp_us';
import type { Url } from './fields/url';
import type { User } from './fields/user';
import type { UserAgent } from './fields/user_agent';
import type { Faas } from './fields/faas';
import type { SpanLink } from './fields/span_links';
import type { Server } from './fields/server';
interface Processor {
    name: 'transaction';
    event: 'transaction';
}
export interface TransactionRaw extends APMBaseDoc {
    processor: Processor;
    timestamp: TimestampUs;
    trace: {
        id: string;
    };
    event?: {
        outcome?: EventOutcome;
    };
    transaction: {
        duration: {
            us: number;
        };
        id: string;
        marks?: {
            agent?: {
                [name: string]: number;
            };
        };
        name?: string;
        page?: Page;
        result?: string;
        sampled?: boolean;
        span_count?: {
            started?: number;
            dropped?: number;
        };
        type: string;
        custom?: Record<string, unknown>;
        message?: {
            queue?: {
                name: string;
            };
            age?: {
                ms: number;
            };
            body?: string;
            headers?: Record<string, unknown>;
        };
    };
    container?: Container;
    ecs?: {
        version?: string;
    };
    host?: Host;
    http?: Http;
    server?: Server;
    kubernetes?: Kubernetes;
    process?: Process;
    service: Service;
    url?: Url;
    user?: User;
    user_agent?: UserAgent;
    cloud?: Cloud;
    faas?: Faas;
    span?: {
        links?: SpanLink[];
    };
}
export {};
