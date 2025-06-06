import type { EsqlTool } from '@kbn/onechat-common';

export type EsqlToolCreateRequest = Omit<
  EsqlTool,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
};
