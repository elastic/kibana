import type { Logger } from '@kbn/logging';
import type { CoreAuditService } from '@kbn/core/server';
import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ProductDocInstallClient } from '../doc_install_status';
import type { DocumentationManagerAPI, DocGetStatusResponse, DocInstallOptions, DocUninstallOptions, DocUpdateOptions, DocUpdateAllOptions, SecurityLabsInstallOptions, SecurityLabsUninstallOptions, SecurityLabsStatusResponse } from './types';
import type { PerformUpdateResponse } from '../../../common/http_api/installation';
import type { PackageInstaller } from '../package_installer';
/**
 * High-level installation service, handling product documentation
 * installation as unary operations, abstracting away the fact
 * that documentation is composed of multiple entities.
 */
export declare class DocumentationManager implements DocumentationManagerAPI {
    private logger;
    private taskManager;
    private licensing;
    private docInstallClient;
    private auditService;
    private packageInstaller?;
    constructor({ logger, taskManager, licensing, docInstallClient, auditService, packageInstaller, }: {
        logger: Logger;
        taskManager: TaskManagerStartContract;
        licensing: LicensingPluginStart;
        docInstallClient: ProductDocInstallClient;
        auditService: CoreAuditService;
        packageInstaller?: PackageInstaller;
    });
    install(options: DocInstallOptions): Promise<void>;
    update(options: DocUpdateOptions): Promise<void>;
    updateAll(options?: DocUpdateAllOptions): Promise<{
        inferenceIds: string[];
    }>;
    updateSecurityLabsAll(options?: {
        forceUpdate?: boolean;
    }): Promise<{
        inferenceIds: string[];
    }>;
    uninstall(options: DocUninstallOptions): Promise<void>;
    /**
     * @param inferenceId - The inference ID to get the status for. If not provided, the default ELSER inference ID will be used.
     */
    getStatus({ inferenceId }: {
        inferenceId: string;
    }): Promise<DocGetStatusResponse>;
    getStatuses({ inferenceIds, }: {
        inferenceIds: string[];
    }): Promise<Record<string, PerformUpdateResponse>>;
    installSecurityLabs(options: SecurityLabsInstallOptions): Promise<void>;
    uninstallSecurityLabs(options: SecurityLabsUninstallOptions): Promise<void>;
    uninstallOpenAPISpec(options: SecurityLabsUninstallOptions): Promise<void>;
    getSecurityLabsStatus({ inferenceId, }: {
        inferenceId: string;
    }): Promise<SecurityLabsStatusResponse>;
    installOpenApiSpec(options: SecurityLabsInstallOptions): Promise<void>;
    getOpenApiSpecStatus({ inferenceId, }: {
        inferenceId: string;
    }): Promise<SecurityLabsStatusResponse>;
}
