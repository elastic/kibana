import type { MessageContentComplex, MessageContentImageUrl, MessageContentText } from '@langchain/core/messages';
/**
 * Type guard for image_url message content
 */
export declare function isMessageContentImageUrl(content: MessageContentComplex): content is MessageContentImageUrl;
/**
 * Type guard for text message content
 */
export declare function isMessageContentText(content: MessageContentComplex): content is MessageContentText;
