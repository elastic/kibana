import type { SearchHit } from '@kbn/es-types';
import type { Artifact, ArtifactElasticsearchProperties, NewArtifact } from './types';
export declare const esSearchHitToArtifact: <T extends Pick<SearchHit<ArtifactElasticsearchProperties>, "_id" | "_source">>({ _id: id, _source: { compression_algorithm: compressionAlgorithm, decoded_sha256: decodedSha256, decoded_size: decodedSize, encoded_sha256: encodedSha256, encoded_size: encodedSize, encryption_algorithm: encryptionAlgorithm, package_name: packageName, ...attributesNotNeedingRename }, }: T) => Artifact;
export declare const newArtifactToElasticsearchProperties: ({ encryptionAlgorithm, packageName, encodedSize, encodedSha256, decodedSize, decodedSha256, compressionAlgorithm, ...attributesNotNeedingRename }: NewArtifact) => ArtifactElasticsearchProperties;
export declare const relativeDownloadUrlFromArtifact: <T extends Pick<Artifact, "identifier" | "decodedSha256">>({ identifier, decodedSha256, }: T) => string;
export declare const uniqueIdFromArtifact: <T extends Pick<Artifact, "identifier" | "decodedSha256" | "packageName">>({ identifier, decodedSha256, packageName, }: T) => string;
export declare const uniqueIdFromId: (id: string, packageName: string) => string;
