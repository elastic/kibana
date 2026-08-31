declare module 'dom-to-image-more' {
  interface DomToImageOptions {
    quality?: number;
    bgcolor?: string;
    cacheBust?: boolean;
    width?: number;
    height?: number;
    style?: Record<string, string>;
    styleFilter?: (style: CSSStyleSheet) => boolean;
    type?: string;
  }

  interface DomToImage {
    toBlob(node: Node, options?: DomToImageOptions): Promise<Blob>;
  }

  const domtoimage: DomToImage;
  export default domtoimage;
}
