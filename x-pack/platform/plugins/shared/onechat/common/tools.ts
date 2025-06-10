import type { EsqlTool } from '@kbn/onechat-common';

export type EsqlToolCreateRequest = Omit<EsqlTool, "id" | "schema" | "handler"> & {
  id?: string;
};
