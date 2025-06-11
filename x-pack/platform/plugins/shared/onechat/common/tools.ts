import { ToolDescriptorMeta } from "@kbn/onechat-common";
import { EsqlTool, RegisteredToolMeta } from "@kbn/onechat-server";


export type EsqlToolCreateRequest = Omit<EsqlTool, "id" | "schema" | "handler"> & {
  id: string;
  meta?: RegisteredToolMeta;
}
