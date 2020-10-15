def promote(snapshotVersion, snapshotId) {
  def snapshotDestination = "${snapshotVersion}/archives/${snapshotId}"
  def MANIFEST_URL = "https://storage.googleapis.com/kibana-ci-es-snapshots-daily/${snapshotDestination}/manifest.json"

  dir('verified-manifest') {
    def verifiedSnapshotFilename = 'manifest-latest-verified.json'

    sh """
      curl -O '${MANIFEST_URL}'
      mv manifest.json ${verifiedSnapshotFilename}
    """

    googleStorageUpload(
      credentialsId: 'kibana-ci-gcs-plugin',
      bucket: "gs://kibana-ci-es-snapshots-daily/${snapshotVersion}",
      pattern: verifiedSnapshotFilename,
      sharedPublicly: false,
      showInline: false,
    )
  }

  // This would probably be more efficient if we could just copy using gsutil and specifying buckets for src and dest
  // But we don't currently have access to the GCS credentials in a way that can be consumed easily from here...
  dir('transfer-to-permanent') {
    googleStorageDownload(
      credentialsId: 'kibana-ci-gcs-plugin',
      bucketUri: "gs://kibana-ci-es-snapshots-daily/${snapshotDestination}/*",
      localDirectory: '.',
      pathPrefix: snapshotDestination,
    )

    def manifestJson = readFile file: 'manifest.json'
    writeFile(
      file: 'manifest.json',
      text: manifestJson.replace("kibana-ci-es-snapshots-daily/${snapshotDestination}", "kibana-ci-es-snapshots-permanent/${snapshotVersion}")
    )

    // Ideally we would have some delete logic here before uploading,
    // But we don't currently have access to the GCS credentials in a way that can be consumed easily from here...
    googleStorageUpload(
      credentialsId: 'kibana-ci-gcs-plugin',
      bucket: "gs://kibana-ci-es-snapshots-permanent/${snapshotVersion}",
      pattern: '*.*',
      sharedPublicly: false,
      showInline: false,
    )
  }
}

return this
