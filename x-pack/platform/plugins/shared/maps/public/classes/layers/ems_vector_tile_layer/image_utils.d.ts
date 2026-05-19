export class AlphaImage {
    static copy(srcImg: any, dstImg: any, srcPt: any, dstPt: any, size: any): void;
    constructor(size: any, data: any);
    resize(size: any): void;
    clone(): AlphaImage;
}
export class RGBAImage {
    static copy(srcImg: any, dstImg: any, srcPt: any, dstPt: any, size: any): void;
    constructor(size: any, data: any);
    resize(size: any): void;
    replace(data: any, copy: any): void;
    data: any;
    clone(): RGBAImage;
}
