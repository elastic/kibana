declare module 'dom-to-image-more' {
  export interface DomToImageOptions {
    bgcolor?: string;
    cacheBust?: boolean;
    quality?: number;
    width?: number;
    height?: number;
    style?: Record<string, string>;
    styleFilter?: (style: CSSStyleSheet) => boolean;
  }

  const domtoimage: {
    toBlob(node: Node, options?: DomToImageOptions): Promise<Blob | null>;
  };

  export default domtoimage;
}
