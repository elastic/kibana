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

These commands show how to set up an environment to build:
```sh
# Allow our scripts to use depot_tools commands
export PATH=$HOME/chromium/depot_tools:$PATH

# Create a dedicated working directory for this directory of Python scripts.
mkdir ~/chromium && cd ~/chromium

# Copy the scripts from the Kibana team's GCS bucket
gsutil cp -r gs://headless_shell_staging/build_chromium .

# Install the OS packages, configure the environment, download the chromium source (25GB)
python ./build_chromium/init.py [arch_name]

# Run the build script with the path to the chromium src directory, the git commit hash
python ./build_chromium/build.py 70f5d88ea95298a18a85c33c98ea00e02358ad75 x64

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

## Build args

A good how-to on building Chromium from source is
[here](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md).

We have an `linux/args.gn` file that is automatically copied to the build target directory.

To get a list of the build arguments that are enabled, install `depot_tools` and run
`gn args out/headless --list`. It prints out all of the flags and their
settings, including the defaults. Some build flags are documented
[here](https://www.chromium.org/developers/gn-build-configuration).

**NOTE:** Please, make sure you consult @elastic/kibana-security before you change, remove or add any of the build flags.

## Directions for Elasticians

If you wish to use a remote VM to build, you'll need access to our GCP account.

**NOTE:** The builds should be done in Ubuntu on x64 architecture. ARM builds
are created in x64 using cross-compiling. CentOS is not supported for building Chromium.

1. Login to Google Cloud Console
2. Click the "Compute Engine" tab.
3. Create a Linux VM:
   - 8 CPU
   - 30GB memory
   - 80GB free space on disk (Try `ncdu /home` to see where space is used.)
   - git
   - python2 (`python` must link to `python2`)
   - lsb_release
   - tmux is recommended in case your ssh session is interrupted
   - "Cloud API access scopes": must have **read / write** scope for the Storage API
4. Install [Google Cloud SDK](https://cloud.google.com/sdk) locally to ssh into the GCP instance

## Artifacts

After the build completes, there will be a .zip file and a .md5 file in `~/chromium/chromium/src/out/headless`. These are named like so: `chromium-{first_7_of_SHA}-{platform}-{arch}`, for example: `chromium-4747cc2-linux-x64`.
The zip files and md5 files are copied to a **staging** bucket in GCP storage.

To publish the built artifacts for bunding in Kibana, copy the files from the `headless_shell_staging` bucket to the `headless_shell` bucket.
```
gsutil cp gs://headless_shell_staging/chromium-d163fd7-linux_arm64.md5 gs://headless_shell/
gsutil cp gs://headless_shell_staging/chromium-d163fd7-linux_arm64.zip gs://headless_shell/
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

## Resources

The following links provide helpful context about how the Chromium build works, and its prerequisites:

- Tools for Chromium version information: https://omahaproxy.appspot.com/
- https://www.chromium.org/developers/how-tos/get-the-code/working-with-release-branches
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/build_instructions.md
- Some build-flag descriptions: https://www.chromium.org/developers/gn-build-configuration
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh
