# Chromium build

We ship our own headless build of Chromium which is significantly smaller than
the standard binaries shipped by Google. The scripts in this folder can be used
to accept a commit hash from the Chromium repository, and initialize the build
on Ubuntu Linux.

## Why do we do this

By default, Puppeteer will download a zip file containing the Chromium browser for any
OS. This creates problems on Linux, because Chromium has a dependency on X11, which
is often not installed for a server environment. We don't want to make a requirement
for Linux that you need X11 to run Kibana. To work around this, we create our own Chromium
build, using the
[`headless_shell`](https://chromium.googlesource.com/chromium/src/+/5cf4b8b13ed518472038170f8de9db2f6c258fe4/headless)
build target. There are no (trustworthy) sources of these builds available elsewhere.

Fortunately, creating the custom builds is only necessary for Linux. When you have a build
of Kibana for Linux, or if you use a Linux desktop to develop Kibana, you have a copy of
`headless_shell` bundled inside. When you have a Windows or Mac build of Kibana, or use
either of those for development, you have a copy of the full build of Chromium, which
was downloaded from the main [Chromium download
location](https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html).

## Build Script Usage

The system OS requires a few setup steps:
1. Required packages: `bzip2`, `git`, `lsb_release`, `python3`
2. The `python` command needs to launch Python 3.
3. Recommended: `tmux`, as your ssh session may get interrupted

These commands show how to set up an environment to build:
```sh
# Allow our scripts to use depot_tools commands
export PATH=$HOME/chromium/depot_tools:$PATH

# Create a dedicated working directory for this directory of Python scripts.
mkdir ~/chromium && cd ~/chromium

# Copy the scripts from the Kibana team's GCS bucket
gsutil cp -r gs://headless_shell_staging/build_chromium .

# Install the OS packages, configure the environment, download the chromium source (25GB)
python ./build_chromium/init.py

# Run the build script with the path to the chromium src directory, the git commit hash
python ./build_chromium/build.py 70f5d88ea95298a18a85c33c98ea00e02358ad75 x64

# Make sure you are using python3, you can state the path explicitly if needed
/usr/bin/python3 ./build_chromium/build.py 67649b10b92bb182fba357831ef7dd6a1baa5648 x64

# OR You can build for ARM
python ./build_chromium/build.py 70f5d88ea95298a18a85c33c98ea00e02358ad75 arm64
```

**NOTE:** The `init.py` script updates git config to make it more possible for
the Chromium repo to be cloned successfully. If checking out the Chromium fails
with "early EOF" errors, the instance could be low on memory or disk space.

## Getting the Commit Hash

If you need to bump the version of Puppeteer, you need to get a new git commit hash for Chromium that corresponds to the Puppeteer version.
```
node scripts/chromium_version.js [PuppeteerVersion]
```

When bumping the Puppeteer version, make sure you also update the `ChromiumArchivePaths.revision` variable in
`x-pack/plugins/reporting/server/browsers/chromium/paths.ts`.

In some cases the revision number might not be available for the darwin or windows builds in `https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html`. For example, 1181205 was not available for darwin arm64 or windows. In that case, the next available revision numbers 1181286 and 1181280 were used. 

## Build args

A good how-to on building Chromium from source is
[here](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md).

We have an `linux/args.gn` file that is automatically copied to the build target directory.

To get a list of the build arguments that are enabled, install `depot_tools` and run
`gn args out/headless --list` from the `chromium/src` directory. It prints out all of the flags and their
settings, including the defaults. Some build flags are documented
[here](https://www.chromium.org/developers/gn-build-configuration).

**NOTE:** Please, make sure you consult @elastic/kibana-security before you change, remove or add any of the build flags.

## Artifacts

After the build completes, there will be a .zip file and a .md5 file in `~/chromium/chromium/src/out/headless`. These are named like so: `chromium-{first_7_of_SHA}-{platform}-{arch}`, for example: `chromium-4747cc2-linux-x64`.
The zip files and md5 files are copied to a **staging** bucket in GCP storage.

To publish the built artifacts for bunding in Kibana, copy the files from the `headless_shell_staging` bucket to the `headless_shell` bucket.
```
gsutil cp gs://headless_shell_staging/chromium-67649b1-linux_arm64.md5 gs://headless_shell/
gsutil cp gs://headless_shell_staging/chromium-67649b1-linux_arm64.zip gs://headless_shell/
```

IMPORTANT: Do not replace builds in the `headless_shell` bucket that are referenced in an active Kibana branch. CI tests on that branch will fail since the archive checksum no longer matches the original version.

## Testing
Search the Puppeteer Github repo for known issues that could affect our use case, and make sure to test anywhere that is affected.

Here's the steps on how to test a Puppeteer upgrade, run these tests on Mac, Windows, Linux x64 and Linux arm64:

- Make sure the Reporting plugin is fetching the correct version of the browser
  at start-up time, and that it can successfully unzip it and copy the files to
  `x-pack/plugins/reporting/chromium`
- Make sure there are no errors when using the **Reporting diagnostic tool**
- All functional and API tests that generate PDF and PNG files should pass.
- Use a VM to run Kibana in a low-memory environment and try to generate a PNG of a dashboard that outputs as a 4MB file. Document the minimum requirements in the PR.

## Testing Chromium upgrades on a Windows Machine

Directions on creating a build of Kibana off an existing PR can be found here: 
https://www.elastic.co/guide/en/kibana/current/building-kibana.html 
You will need this build to install on your windows device to test the in progress PR. 

The default extractor for Windows might give `Path too long errors`. 
- Install the zipped file onto your C:\ directory in case the path actually is too long. 
- Use 7Zip or WinZip to extract the contents of the kibana build.
Reference: This article can be helpful:
https://www.partitionwizard.com/disk-recovery/error-0x80010135-path-too-long.html  

For an elasticsearch cluster to base the latest kibana build with, you can use a snapshot.sh bash script to generate the latest build. Create a file called snapshot.sh and put the following into the file: 

```
runQuery() {
  curl --silent -XGET https://artifacts-api.elastic.co${1}
}
BUILD_HASH=$(runQuery /v1/versions/${VERSION}-SNAPSHOT/builds | jq -r '.builds[0]')
echo "Latest build hash :: $BUILD_HASH"
KBN_DOWNLOAD=$(runQuery /v1/versions/${VERSION}-SNAPSHOT/builds/$BUILD_HASH/projects/elasticsearch/packages/elasticsearch-${VERSION}-SNAPSHOT-windows-x86_64.zip)
echo $KBN_DOWNLOAD | jq -r '.package.url'
```

In the terminal once you have the snapshot.sh file written run: 
chmod a+x snapshot.sh to make the file executable
Then set the version variable within the script to what you need by typing the following (in this example 8.8.0):
VERSION=8.8.0 ./snapshot.sh

In the terminal you should see a web address that will give you a download of elasticsearch. 

You may need to disable xpack security in the elasticsearch.yml 
xpack.security.enabled: false

Make sure nothing is set in the kibana.yml

Run `.\bin\elasticsearch.bat` in the elasticsearch directory first and then once it's up run `.\bin\kibana.bat`

Navigate to localhost:5601 and there shouldn't be any prompts to set up security etc. To test PNG reporting, you may need to upload a license. Navigate to https://wiki.elastic.co/display/PM/Internal+License+-+X-Pack+and+Endgame and download the license.json from Internal Licenses. 

Navigate to Stack Management in Kibana and you can upload the license.json from internal licenses. You won't need to restart the cluster and should be able to test the Kibana feature as needed at this point. 

## Resources

The following links provide helpful context about how the Chromium build works, and its prerequisites:

- Tools for Chromium version information: https://omahaproxy.appspot.com/
- https://www.chromium.org/developers/how-tos/get-the-code/working-with-release-branches
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/build_instructions.md
- Some build-flag descriptions: https://www.chromium.org/developers/gn-build-configuration
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh
