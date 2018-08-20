import subprocess, os, sys, platform, zipfile, hashlib, shutil
from build_util import runcmd, mkdir, md5_file, script_dir, root_dir, configure_environment

# This file builds Chromium headless. It is written with the intent to
# read top-down like a bash script without requiring lots of jumping
# around / between functions to understand the flow.

# Verify that we have an argument, and if not print instructions
if (len(sys.argv) < 2):
  print('Usage:')
  print('python build.py {chromium_version}')
  print('Example:')
  print('python build.py 68.0.3440.106')
  print('python build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479')
  sys.exit(1)

# This is any valid git checkout {source_version} target, so
# a tag such as 68.0.3440.106, a commit sha, a branch, etc
source_version = sys.argv[1]

print('Building Chromium ' + source_version)

# Set the environment variables required by the build tools
print('Configuring the build environment')
configure_environment()

# Sync the codebase to the correct version, syncing master first
# to ensure that we actually have all the versions we may refer to
print('Syncing source code')

os.chdir(os.path.join(root_dir, 'chromium/src'))

runcmd('git checkout master')
runcmd('git fetch origin')
runcmd('gclient sync --with_branch_heads --with_tags --jobs 16')
runcmd('git checkout ' + source_version)
runcmd('gclient sync --with_branch_heads --with_tags --jobs 16')
runcmd('gclient runhooks')

# Copy args/{Linux | Darwin | Windows}.gn from the root of our directory to out/headless/args.gn,
# We're currenty in {root}/chromium/src, so we need to back out twice.
# generate the build arguments basedon that file.
platform_build_args = os.path.join(script_dir, platform.system().lower(), 'args.gn')
print('Generating platform-specific args')
print('Copying build args: ' + platform_build_args + ' to out/headless/args.gn')
mkdir('out/headless')
shutil.copyfile(platform_build_args, 'out/headless/args.gn')
runcmd('gn gen out/headless')

# Build Chromium... this takes *forever* on underpowered VMs
print('Compiling... this will take a while')
runcmd('autoninja -C out/headless headless_shell')

# The artifact filenames
bin_dir = os.path.join(root_dir, 'bin')
bin_filename = os.path.join(bin_dir, 'headless_shell')

# Optimize the output on Linux and Mac by stripping inessentials from the binary
print('Copying ' + bin_filename)
mkdir(bin_dir)
if platform.system() == 'Windows':
  shutil.copyfile('out/headless/headless_shell', bin_filename)
else:
  runcmd('strip -o ' + bin_filename + ' out/headless/headless_shell')

# Create the zip and generate the md5 hash using filenames like:
# chromium-68_0_34-linux.zip
truncated_version = source_version.replace('.', '_')[:7].strip('_')
filename_prefix = 'chromium-' + truncated_version + '-' + platform.system().lower()
zip_filename = os.path.join(bin_dir, filename_prefix + '.zip')
md5_filename = os.path.join(bin_dir, filename_prefix + '.md5')

print('Creating ' + zip_filename)
zipfile.ZipFile(zip_filename, mode='w').write(bin_filename, 'headless_shell-' + platform.system().lower() + '/headless_shell')

print('Creating ' + md5_filename)
with open (md5_filename, 'w') as f:
  f.write(md5_file(zip_filename))
